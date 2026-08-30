from flask import Flask, render_template, jsonify, request
import requests
import os
import json
import threading
import time

from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone

load_dotenv()

app = Flask(__name__)

API_KEY = os.getenv("SERVIX_API_KEY")

BASE_URL = "https://servix.cc/api/v1"

ASSETS = [
    "USD_RLS",
    "EUR_RLS",
    "GOLD_18_RLS",
    "SEKKEH_RLS"
]

TEHRAN_TZ = timezone(
    timedelta(hours=3, minutes=30)
)

UPDATE_HOUR = 14
UPDATE_MINUTE = 0

CACHE_FILE = "market_cache.json"

cache_lock = threading.Lock()

PERIOD_CONFIG = {

    "day": {
        "days": 1,
        "interval": "1h"
    },

    "week": {
        "days": 7,
        "interval": "4h"
    },

    "month": {
        "days": 30,
        "interval": "4h"
    }

}

ASSET_NAMES = {

    "USD_RLS": "دلار",

    "EUR_RLS": "یورو",

    "GOLD_18_RLS": "طلای ۱۸ عیار",

    "SEKKEH_RLS": "سکه امامی"

}

@app.route("/")
def home():

    return render_template("index.html")

def get_headers():

    return {
        "X-API-Key": API_KEY
    }

def get_utc_now():

    return datetime.now(
        timezone.utc
    )

def get_tehran_now():

    return datetime.now(
        TEHRAN_TZ
    )

def load_cache():

    if not os.path.exists(CACHE_FILE):

        return {
            "last_update": None,
            "prices": [],
            "history": {},
            "market_summary": []
        }

    try:

        with open(
            CACHE_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            return json.load(file)

    except (
        json.JSONDecodeError,
        OSError
    ):

        return {
            "last_update": None,
            "prices": [],
            "history": {},
            "market_summary": []
        }

def save_cache(cache):

    temporary_file = (
        CACHE_FILE + ".tmp"
    )

    with open(
        temporary_file,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            cache,
            file,
            ensure_ascii=False,
            indent=2
        )

    os.replace(
        temporary_file,
        CACHE_FILE
    )

def fetch_current_prices():

    url = (
        f"{BASE_URL}/assets"
    )

    params = {

        "codes":
            ",".join(ASSETS)

    }

    response = requests.get(

        url,

        params=params,

        headers=get_headers(),

        timeout=15

    )

    if not response.ok:

        raise requests.HTTPError(

            f"Prices API error: "
            f"{response.status_code}"

        )

    data = response.json()

    if not isinstance(data, list):

        raise ValueError(
            "ساختار قیمت‌ها نامعتبر است"
        )

    return data

def get_ohlc(
    asset,
    interval,
    from_time,
    to_time
):

    url = (
        f"{BASE_URL}/assets/"
        f"{asset}/ohlc"
    )

    params = {
        "interval": interval,
        "from": from_time,
        "to": to_time
    }

    response = requests.get(
        url,
        params=params,
        headers=get_headers(),
        timeout=15
    )

    print("\n========== OHLC DEBUG ==========")
    print("URL:", response.url)
    print("STATUS:", response.status_code)
    print("RESPONSE:", response.text)
    print("================================\n")

    if not response.ok:

        raise requests.HTTPError(
            f"OHLC API error: "
            f"{response.status_code}"
        )

    data = response.json()

    if not isinstance(data, dict):

        raise ValueError(
            "ساختار OHLC نامعتبر است"
        )

    candles = data.get(
        "candles",
        []
    )

    if not isinstance(candles, list):

        raise ValueError(
            "اطلاعات کندل نامعتبر است"
        )

    return candles

def candles_to_history(candles):

    result = []

    for candle in candles:

        close = candle.get("close")
        low = candle.get("low")
        high = candle.get("high")
        start = candle.get("start")

        if (
            close is None
            or start is None
        ):

            continue

        try:

            value = float(close)

        except (
            TypeError,
            ValueError
        ):

            continue

        try:

            low_value = float(low)

        except (
            TypeError,
            ValueError
        ):

            low_value = value

        try:

            high_value = float(high)

        except (
            TypeError,
            ValueError
        ):

            high_value = value

        result.append({

            "value":
                value,

            "low":
                low_value,

            "high":
                high_value,

            "businessTime":
                start

        })

    return result

def build_market_summary(
    prices,
    previous_prices,
    history_data,
    update_time
):

    result = []

    for asset in ASSETS:

        current_value = None
        previous_value = None

        for item in prices:

            if item.get("code") == asset:

                try:

                    current_value = float(
                        item.get("value")
                    )

                except (
                    TypeError,
                    ValueError
                ):

                    current_value = None

                break

        for item in previous_prices:

            if item.get("code") == asset:

                try:

                    previous_value = float(
                        item.get("value")
                    )

                except (
                    TypeError,
                    ValueError
                ):

                    previous_value = None

                break

        if current_value is None:

            continue

        day_history = history_data.get(
            f"{asset}_day",
            []
        )

        valid_history = []

        for candle in day_history:

            try:

                value = float(
                    candle["value"]
                )

                low_value = float(
                    candle.get(
                        "low",
                        value
                    )
                )

                high_value = float(
                    candle.get(
                        "high",
                        value
                    )
                )

                valid_history.append({

                    "value": value,

                    "low": low_value,

                    "high": high_value,

                    "businessTime":
                        candle.get(
                            "businessTime"
                        )

                })

            except (
                KeyError,
                TypeError,
                ValueError
            ):

                continue

        valid_history.sort(
            key=lambda item:
                item.get(
                    "businessTime"
                ) or ""
        )

        if valid_history:

            low = min(
                candle["low"]
                for candle in valid_history
            )

            high = max(
                candle["high"]
                for candle in valid_history
            )

        else:

            low = current_value
            high = current_value

        change_percent = 0.0

        if len(valid_history) >= 2:

            first_value = (
                valid_history[0]["value"]
            )

            last_value = (
                valid_history[-1]["value"]
            )

            if first_value != 0:

                change_percent = (

                    (
                        last_value -
                        first_value
                    )
                    /
                    first_value

                ) * 100

        result.append({

            "code":
                asset,

            "current":
                current_value,

            "previous":
                previous_value,

            "changePercent":
                change_percent,

            "low":
                low,

            "high":
                high,

            "businessTime":
                update_time

        })

    return result

def update_all_market_data():

    print(
        "================================"
    )

    print(
        "شروع بروزرسانی کامل بازار..."
    )

    now = get_utc_now()

    with cache_lock:

        old_cache = load_cache()

    previous_prices = (
        old_cache.get(
            "prices",
            []
        )
    )

    print(
        "دریافت قیمت‌های فعلی..."
    )

    prices = fetch_current_prices()

    for item in prices:

        code = item.get("code")

        current_value = item.get(
            "value"
        )

        previous_value = None

        for old_item in previous_prices:

            if old_item.get("code") == code:

                previous_value = old_item.get(
                    "value"
                )

                break

        item["previousValue"] = (
            previous_value
        )

        try:

            current_number = float(
                current_value
            )

            previous_number = (
                float(previous_value)
                if previous_value is not None
                else None
            )

            if (
                previous_number is not None
                and
                previous_number != 0
            ):

                change_percent = (

                    (
                        current_number -
                        previous_number
                    )
                    /
                    previous_number

                ) * 100

            else:

                change_percent = 0.0

        except (
            TypeError,
            ValueError
        ):

            change_percent = 0.0

        item["changePercent"] = (
            change_percent
        )

    history_data = {}

    for asset in ASSETS:

        for period, config in (
            PERIOD_CONFIG.items()
        ):

            days = config["days"]

            interval = config["interval"]

            from_time = (

                now -
                timedelta(
                    days=days
                )

            )

            print(
                f"دریافت {asset} "
                f"{period}..."
            )

            candles = get_ohlc(

                asset,

                interval,

                from_time
                    .isoformat()
                    .replace(
                        "+00:00",
                        "Z"
                    ),

                now
                    .isoformat()
                    .replace(
                        "+00:00",
                        "Z"
                    )

            )

            history_data[
                f"{asset}_{period}"
            ] = candles_to_history(
                candles
            )

    update_time = (
        now.isoformat()
    )

    market_summary = (
        build_market_summary(

            prices,

            previous_prices,

            history_data,

            update_time

        )
    )

    cache = {

        "last_update":
            update_time,

        "prices":
            prices,

        "history":
            history_data,

        "market_summary":
            market_summary

    }

    with cache_lock:

        save_cache(
            cache
        )

    print(
        "بروزرسانی کامل انجام شد."
    )

    print(
        "================================"
    )

    return cache

def should_update_today():

    with cache_lock:

        cache = load_cache()

    last_update = cache.get(
        "last_update"
    )

    now_local = get_tehran_now()

    if not last_update:

        if (

            now_local.hour >
            UPDATE_HOUR

            or

            (
                now_local.hour ==
                UPDATE_HOUR

                and

                now_local.minute >=
                UPDATE_MINUTE
            )

        ):

            return True

        return False

    try:

        last_update_datetime = (
            datetime.fromisoformat(
                last_update
            )
        )

        last_update_local = (
            last_update_datetime
            .astimezone(
                TEHRAN_TZ
            )
        )

    except (
        ValueError,
        TypeError
    ):

        return False

    if (
        last_update_local.date()
        ==
        now_local.date()
    ):

        return False

    if (

        now_local.hour >
        UPDATE_HOUR

        or

        (
            now_local.hour ==
            UPDATE_HOUR

            and

            now_local.minute >=
            UPDATE_MINUTE
        )

    ):

        return True

    return False
def auto_update_worker():

    print(
        "Auto update worker started."
    )

    while True:

        try:

            now_local = get_tehran_now()

            print(
                "زمان فعلی تهران:",
                now_local.strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
            )

            if should_update_today():

                print(
                    "زمان بروزرسانی روزانه رسیده است."
                )

                try:

                    update_all_market_data()

                except Exception as error:

                    print(
                        "Automatic update error:",
                        error
                    )

                    print(
                        "به دلیل خطا، تلاش بعدی 10 دقیقه دیگر انجام می‌شود."
                    )

                    time.sleep(600)

        except Exception as error:

            print(
                "Worker error:",
                error
            )

        time.sleep(60)
def start_auto_update():

    worker = threading.Thread(

        target=
            auto_update_worker,

        daemon=True

    )

    worker.start()

@app.route(
    "/refresh",
    methods=["POST"]
)
def manual_refresh():

    try:

        cache = (
            update_all_market_data()
        )

        return jsonify({

            "success":
                True,

            "message":
                "اطلاعات بازار با موفقیت بروزرسانی شد.",

            "last_update":
                cache["last_update"]

        })

    except Exception as error:

        print(
            "Manual refresh error:",
            error
        )

        return jsonify({

            "success":
                False,

            "error":
                "بروزرسانی اطلاعات بازار انجام نشد.",

            "details":
                str(error)

        }), 502

@app.route("/prices")
def prices():

    with cache_lock:

        cache = load_cache()

    return jsonify(
        cache.get(
            "prices",
            []
        )
    )

@app.route("/history")
def history():

    asset = request.args.get(
        "asset",
        "USD_RLS"
    )

    period = request.args.get(
        "period",
        "month"
    )

    if asset not in ASSETS:

        return jsonify({

            "error":
                "دارایی نامعتبر است"

        }), 400

    if period not in PERIOD_CONFIG:

        return jsonify({

            "error":
                "بازه زمانی نامعتبر است"

        }), 400

    with cache_lock:

        cache = load_cache()

    key = (
        f"{asset}_{period}"
    )

    history_data = (
        cache
        .get(
            "history",
            {}
        )
        .get(
            key,
            []
        )
    )

    if (

        not isinstance(
            history_data,
            list
        )

        or

        len(history_data) < 2

    ):

        return jsonify({

            "error":
                "اطلاعات کافی برای نمودار وجود ندارد"

        }), 502

    return jsonify(
        history_data
    )

@app.route("/market-summary")
def market_summary():

    with cache_lock:

        cache = load_cache()

    return jsonify(
        cache.get(
            "market_summary",
            []
        )
    )

@app.route("/market-status")
def market_status():

    with cache_lock:

        cache = load_cache()

    last_update = cache.get(
        "last_update"
    )

    return jsonify({

        "last_update":
            last_update,

        "has_data":
            bool(
                cache.get(
                    "prices"
                )
            )

    })

start_auto_update()


if __name__ == "__main__":

    app.run(
        debug=True,
        use_reloader=False
    )