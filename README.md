# noviproxy

افزونه‌ی کروم برای تنظیم سریع پروکسی **SOCKS5** با یک کلیک.
A tiny Chrome extension (Manifest V3) to set a SOCKS5 proxy manually with one click.

## امکانات / Features
- اتصال و قطع با یک دکمه، نشان `ON` روی آیکون
- ذخیره‌ی چند سرور و سوییچ سریع بین آن‌ها
- لیست Bypass قابل ویرایش
- نمایش IP فعلی برای تست
- رابط فارسی، راست‌چین، تم تیره و روشن خودکار
- بدون ردیابی و بدون هیچ سرور واسط؛ فقط تنظیمات پروکسی خود کروم را تغییر می‌دهد

## نصب / Install
1. این مخزن را دانلود یا clone کن.
2. در کروم برو به `chrome://extensions` و **Developer mode** را روشن کن.
3. **Load unpacked** را بزن و پوشه‌ی پروژه را انتخاب کن.
<img width="340" height="504" alt="Screenshot 2026-10-16 004819" src="https://github.com/user-attachments/assets/3722394c-787d-4957-ac1f-93492224eb79" />

## محدودیت‌ها / Limitations
- کروم از نام کاربری و رمز عبور برای SOCKS5 پشتیبانی نمی‌کند. فقط سرورهای بدون احراز هویت کار می‌کنند (یا از یک پراکسی محلی مثل `127.0.0.1:10808` استفاده کن).
- دکمه‌ی «نمایش IP» به `api.ipify.org` درخواست می‌زند و فقط وقتی کلیک شود اجرا می‌شود.

## مجوز / License
MIT

## سازنده / Author
[RealSiavashYT](https://github.com/RealSiavashYT)
