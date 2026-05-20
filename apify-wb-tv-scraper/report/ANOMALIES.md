# 🚨 WB TV — анализ аномальных цен

> Снимок: **2026-05-20 21:44 UTC** · карточек на входе: **382**

**Severity:** high=13, medium=32, low=33

## 1. Sentinel-цены (заглушки продавцов) — 5

| Цена, ₽ | Диаг. | Бренд | Название | Артикул |
|----------|--------|--------|-----------|----------|
| **999 999** | 32" | Artel | / Телевизор A32MH1300 | [1030929758](https://www.wildberries.ru/catalog/1030929758/detail.aspx) |
| **999 999** | 43" | Artel | / Телевизор 43AU20H | [1031002922](https://www.wildberries.ru/catalog/1031002922/detail.aspx) |
| **999 999** | 50" | Artel | / Телевизор 50AU20K | [1031006980](https://www.wildberries.ru/catalog/1031006980/detail.aspx) |
| **999 999** | 43" | Artel | / Телевизор 43AU20K | [1031006960](https://www.wildberries.ru/catalog/1031006960/detail.aspx) |
| **999 999** | 55" | Artel | / Телевизор 55AU20K | [1031006926](https://www.wildberries.ru/catalog/1031006926/detail.aspx) |

## 2. Подозрительно ДОРОГИЕ (z ≥ 2.5 по диагонали) — 24

| z | Цена, ₽ | Медиана диаг. | Диаг. | Бренд | Название | Артикул |
|----|----------|----------------|--------|--------|-----------|----------|
| **+15.06σ** | 999 999 | 38 199 | 50" | Artel | / Телевизор 50AU20K | [1031006980](https://www.wildberries.ru/catalog/1031006980/detail.aspx) |
| **+13.64σ** | 999 999 | 27 699 | 43" | Artel | / Телевизор 43AU20H | [1031002922](https://www.wildberries.ru/catalog/1031002922/detail.aspx) |
| **+13.64σ** | 999 999 | 27 699 | 43" | Artel | / Телевизор 43AU20K | [1031006960](https://www.wildberries.ru/catalog/1031006960/detail.aspx) |
| **+13.4σ** | 999 999 | 14 734 | 32" | Artel | / Телевизор A32MH1300 | [1030929758](https://www.wildberries.ru/catalog/1030929758/detail.aspx) |
| **+8.43σ** | 999 999 | 40 848 | 55" | Artel | / Телевизор 55AU20K | [1031006926](https://www.wildberries.ru/catalog/1031006926/detail.aspx) |
| **+5.64σ** | 121 991 | 27 699 | 43" | Samsung | / Телевизор 43 дюйма смарт 4K QE43QN90FAUXRU | [817474244](https://www.wildberries.ru/catalog/817474244/detail.aspx) |
| **+5.35σ** | 723 341 | 529 990 | 77" | PHILIPS | / Телевизор 77OLED950, OLED, 4K UHD, Google TV, Ambilight | [732688359](https://www.wildberries.ru/catalog/732688359/detail.aspx) |
| **+5.25σ** | 719 091 | 529 990 | 77" | PHILIPS | / Телевизор 77OLED950, OLED, 4K UHD, Google TV, Ambilight | [982664481](https://www.wildberries.ru/catalog/982664481/detail.aspx) |
| **+4.74σ** | 19 675 | 7 639 | 24" | LG | / 24" Телевизор DLED 24TQ510S-PZ, HD Smart TV | [927043721](https://www.wildberries.ru/catalog/927043721/detail.aspx) |
| **+4.66σ** | 94 207 | 27 699 | 43" | Samsung | / Телевизор смарт 43 дюйма QE43QN90FAUXRU черный | [706240534](https://www.wildberries.ru/catalog/706240534/detail.aspx) |
| **+4.59σ** | 577 490 | 74 991 | 65" | Samsung | / Телевизор QE65QN990FUXRU | [810859679](https://www.wildberries.ru/catalog/810859679/detail.aspx) |
| **+4.31σ** | 603 190 | 90 280 | 75" | Samsung | / Телевизор QE75QN990FUXRU | [810854151](https://www.wildberries.ru/catalog/810854151/detail.aspx) |
| **+4.31σ** | 603 190 | 90 280 | 75" | Samsung | / Телевизор QE75QN990FUXRU | [810842867](https://www.wildberries.ru/catalog/810842867/detail.aspx) |
| **+4.31σ** | 603 190 | 90 280 | 75" | Samsung | / Телевизор QE75QN990FUXRU | [810825784](https://www.wildberries.ru/catalog/810825784/detail.aspx) |
| **+4.22σ** | 579 991 | 90 280 | 75" | Samsung | / Телевизор QE75QN990FUXRU 75″, Мини LED, 8K, 120 Гц | [858569105](https://www.wildberries.ru/catalog/858569105/detail.aspx) |
| **+4.22σ** | 579 990 | 90 280 | 75" | Samsung | / Телевизор QE75QN990FUXRU 75″, Мини LED, 8K, 120 Гц | [810116463](https://www.wildberries.ru/catalog/810116463/detail.aspx) |
| **+4.22σ** | 579 971 | 90 280 | 75" | Samsung | / Телевизор QE75QN990FUXRU 75″, Мини LED, 8K, 120 Гц | [810121887](https://www.wildberries.ru/catalog/810121887/detail.aspx) |
| **+4.22σ** | 579 920 | 90 280 | 75" | Samsung | / Телевизор QLED QE75QN990FUXRU | [824906120](https://www.wildberries.ru/catalog/824906120/detail.aspx) |
| **+3.99σ** | 524 990 | 90 280 | 75" | Samsung | / Телевизор QE75QN900FUXRU | [810842895](https://www.wildberries.ru/catalog/810842895/detail.aspx) |
| **+3.94σ** | 78 015 | 27 699 | 43" | Samsung | / Телевизор смарт 43 дюйма QE43LS03FAUXRU черный | [720809842](https://www.wildberries.ru/catalog/720809842/detail.aspx) |
| **+3.46σ** | 43 791 | 14 734 | 32" | Samsung | / Телевизор смарт 32 дюймов QE32LS03CBUXRU черный | [599214629](https://www.wildberries.ru/catalog/599214629/detail.aspx) |
| **+2.98σ** | 126 480 | 40 848 | 55" | LG | / Телевизор OLED 55'' OLED55C5RLA 4K UHD Smart TV | [425534052](https://www.wildberries.ru/catalog/425534052/detail.aspx) |
| **+2.76σ** | 13 250 | 7 639 | 24" | Topdevice | / Телевизор TDWC24BH3260V | [1037120713](https://www.wildberries.ru/catalog/1037120713/detail.aspx) |
| **+2.54σ** | 107 087 | 40 848 | 55" | HISENSE | / Телевизор смарт 55 дюймов 55U8Q 2025 черный | [797058592](https://www.wildberries.ru/catalog/797058592/detail.aspx) |

## 3. Подозрительно ДЕШЁВЫЕ (z ≤ -2 по диагонали) — 14

| z | Цена, ₽ | Медиана диаг. | Диаг. | Бренд | Название | Артикул |
|----|----------|----------------|--------|--------|-----------|----------|
| **-9.9σ** | 297 943 | 529 990 | 77" | Samsung | / Телевизор 4К QE77S90FAEXRU 77", OLED HDR+, 120 Гц | [693156043](https://www.wildberries.ru/catalog/693156043/detail.aspx) |
| **-9.28σ** | 308 999 | 529 990 | 77" | Haier | / Телевизор 77 S9 Pro | [277503085](https://www.wildberries.ru/catalog/277503085/detail.aspx) |
| **-7.98σ** | 333 233 | 529 990 | 77" | LG | / Телевизор OLED77G5RLA.ARUG | [565514923](https://www.wildberries.ru/catalog/565514923/detail.aspx) |
| **-6.96σ** | 88 089 | 545 186 | 85" | Samsung | / Телевизор LED 85" UE85U8000FUXCE 4K Ultra HD Smart TV | [784441483](https://www.wildberries.ru/catalog/784441483/detail.aspx) |
| **-6.11σ** | 109 984 | 545 186 | 85" | Haier | / Телевизор 85 HQLED S4, 4K, Android TV, EVO TV | [460358796](https://www.wildberries.ru/catalog/460358796/detail.aspx) |
| **-6.09σ** | 110 408 | 545 186 | 85" | Samsung | / Телевизор 4К QE85Q7FAAUXRU 85", HDR, 60 Гц | [693156299](https://www.wildberries.ru/catalog/693156299/detail.aspx) |
| **-4.68σ** | 159 991 | 545 186 | 85" | TCL | / Телевизор 85 дюймов смарт 4K 85P8L (2026) | [969774224](https://www.wildberries.ru/catalog/969774224/detail.aspx) |
| **-4.11σ** | 185 665 | 545 186 | 85" | LG | / Телевизор 85QNED93A6A, QNED, ИИ процессор 8 Gen2 | [575747044](https://www.wildberries.ru/catalog/575747044/detail.aspx) |
| **-3.28σ** | 18 753 | 38 199 | 50" | RAZZ | / Телевизор 50 дюймов C50USS25F UHD 4К Smart ОС Салют WiFi | [430224880](https://www.wildberries.ru/catalog/430224880/detail.aspx) |
| **-3.02σ** | 12 521 | 27 699 | 43" | SHIVAKI | / Телевизор 43" S43NFCH001 Full HD SMART Wi-Fi Android | [420000552](https://www.wildberries.ru/catalog/420000552/detail.aspx) |
| **-2.84σ** | 13 801 | 19 016 | 40" | Skyworth | / Телевизор 40E55G | [277503207](https://www.wildberries.ru/catalog/277503207/detail.aspx) |
| **-2.77σ** | 13 370 | 27 699 | 43" | RAZZ | / Телевизор 43 дюйма HC43FSS26F Full HD Smart ОС Салют WiFi | [883556306](https://www.wildberries.ru/catalog/883556306/detail.aspx) |
| **-2.39σ** | 14 798 | 27 699 | 43" | SBER | / Телевизор SDX-43F3111 43" Full HD, черный | [577718242](https://www.wildberries.ru/catalog/577718242/detail.aspx) |
| **-2.03σ** | 16 250 | 27 699 | 43" | Topdevice | / Телевизор TDWC43BF2110V 43″ HD, черный Smart TV | [1047094771](https://www.wildberries.ru/catalog/1047094771/detail.aspx) |

## 4. Скидки ≥60% (вероятно завышенный MSRP) — 27

| Скидка | Цена, ₽ | Было, ₽ | Диаг. | Бренд | Название | Артикул |
|---------|----------|----------|--------|--------|-----------|----------|
| **−85%** | 6 844 | 46 500 | 24" | Blackton | / Телевизор Bt 24F34B Черный 24" | [293919764](https://www.wildberries.ru/catalog/293919764/detail.aspx) |
| **−72%** | 21 518 | 77 999 | 55" | SHIVAKI | / Телевизор 55 S55QS QLED 4К Сбер ОС | [670146065](https://www.wildberries.ru/catalog/670146065/detail.aspx) |
| **−69%** | 12 521 | 39 999 | 43" | SHIVAKI | / Телевизор 43" S43NFCH001 Full HD SMART Wi-Fi Android | [420000552](https://www.wildberries.ru/catalog/420000552/detail.aspx) |
| **−69%** | 3 135 | 10 000 | — | — | / Смарт приставка для телевизора с vpn | [851018722](https://www.wildberries.ru/catalog/851018722/detail.aspx) |
| **−66%** | 3 171 | 9 450 | — | VINEГРЕТ | / Приставка для телевизора андроид со smart tv 2 16 | [205991494](https://www.wildberries.ru/catalog/205991494/detail.aspx) |
| **−64%** | 35 711 | 98 380 | 60" | Skyworth | / 60" Телевизор 60Q66H, QLED, 120Гц | [440597367](https://www.wildberries.ru/catalog/440597367/detail.aspx) |
| **−64%** | 61 354 | 169 020 | 75" | Skyworth | / 75" Телевизор 75Q67H, QLED, 120Гц, UHD, Wi-Fi, Bluetooth | [440597408](https://www.wildberries.ru/catalog/440597408/detail.aspx) |
| **−64%** | 67 125 | 184 920 | 75" | Skyworth | / 75" Телевизор 75Q66H, QLED, 120Гц, UHD, Wi-Fi, Bluetooth | [440597460](https://www.wildberries.ru/catalog/440597460/detail.aspx) |
| **−64%** | 51 567 | 142 060 | 65" | Skyworth | / 65" Телевизор 65Q75G, 120Гц, UHD | [440597456](https://www.wildberries.ru/catalog/440597456/detail.aspx) |
| **−64%** | 32 938 | 90 740 | 55" | Skyworth | / 55" Телевизор 55Q67H, QLED, 120Гц, UHD, Wi-Fi, Bluetooth | [440597455](https://www.wildberries.ru/catalog/440597455/detail.aspx) |
| **−64%** | 21 148 | 58 260 | 32" | Samsung | / 32" Телевизор UE32F6000FUXRU, без ПО | [569423845](https://www.wildberries.ru/catalog/569423845/detail.aspx) |
| **−64%** | 39 233 | 108 080 | 55" | Samsung | / 55" Телевизор UE55U8000FUXRU, без ПО | [569423883](https://www.wildberries.ru/catalog/569423883/detail.aspx) |
| **−64%** | 54 312 | 149 620 | 55" | Samsung | / 55" Телевизор QE55Q7F5AUXRU, QLED, Ultra HD | [820785870](https://www.wildberries.ru/catalog/820785870/detail.aspx) |
| **−63%** | 9 534 | 25 740 | 32" | ARG | / LED телевизор LD32D7500 диагональ 32″ Full HD, черный | [579983206](https://www.wildberries.ru/catalog/579983206/detail.aspx) |
| **−63%** | 90 034 | 244 660 | 75" | LG | / QNED телевизор 75QNED70A6A 75″ 4K UHD, черный | [767983146](https://www.wildberries.ru/catalog/767983146/detail.aspx) |
| **−63%** | 27 121 | 73 700 | 43" | LG | / Телевизор 43LM5772PLA 43" 4K UHD, черный | [330823253](https://www.wildberries.ru/catalog/330823253/detail.aspx) |
| **−63%** | 38 264 | 103 980 | 50" | LG | / LED Телевизор 50UA73006LA 50 4K, черный | [657759544](https://www.wildberries.ru/catalog/657759544/detail.aspx) |
| **−63%** | 16 725 | 45 450 | 32" | LG | / Телевизор 32 дюйма 82 см Smart-TV WebOS с wi-fi | [801079322](https://www.wildberries.ru/catalog/801079322/detail.aspx) |
| **−63%** | 46 103 | 125 280 | 50" | LG | / Телевизор 50NANO80A6B 50" 4K UHD, черный | [657707999](https://www.wildberries.ru/catalog/657707999/detail.aspx) |
| **−63%** | 74 792 | 203 240 | 65" | LG | / QNED телевизор 65QNED80A6A | [539115062](https://www.wildberries.ru/catalog/539115062/detail.aspx) |
| **−63%** | 56 230 | 152 800 | 55" | LG | / QNED Телевизор 55QNED70A6A 55" 4K, черный | [657783087](https://www.wildberries.ru/catalog/657783087/detail.aspx) |
| **−63%** | 43 769 | 118 940 | 55" | LG | / LED Телевизор 55UA73006LA 55 4K, черный | [657775411](https://www.wildberries.ru/catalog/657775411/detail.aspx) |
| **−63%** | 38 999 | 105 976 | 50" | TCL | / Телевизор смарт 50T6D QLED 4K UHD 50 дюймов Google TV | [907498201](https://www.wildberries.ru/catalog/907498201/detail.aspx) |
| **−63%** | 33 300 | 90 490 | 43" | TCL | / Телевизор смарт 43T6C QLED 4K 43 дюймов Google TV | [103783581](https://www.wildberries.ru/catalog/103783581/detail.aspx) |
| **−62%** | 24 047 | 64 065 | 43" | Яндекс | / ТВ Станция Бейсик LED 43" 4K UHD | [387718599](https://www.wildberries.ru/catalog/387718599/detail.aspx) |
| **−61%** | 36 202 | 93 339 | 55" | TCL | / 55" Ultra HD 4K, 55P69K Телевизор | [575900201](https://www.wildberries.ru/catalog/575900201/detail.aspx) |
| **−60%** | 16 191 | 39 999 | 32" | LG | / FullHD 32" WebOSmart Tv - with ThinQ AI | [399393714](https://www.wildberries.ru/catalog/399393714/detail.aspx) |

## 5. Дубликаты модели с разбросом цен ≥ ×1.4 — 3 групп

### `samsung|ue43f6000fuxru` · ×1.48 (21 344₽ → 31 640₽)

| Цена, ₽ | Диаг. | Название | Артикул |
|---------|-------|----------|---------|
| 21 344 | 43" | / Телевизор LED 43" UE43F6000FUXRU Full HD, Smart | [629218813](https://www.wildberries.ru/catalog/629218813/detail.aspx) |
| 31 640 | 43" | / Телевизор UE43F6000FUXRU, 2025, FULL HD LED Smart TV | [496315317](https://www.wildberries.ru/catalog/496315317/detail.aspx) |

### `hisense|65u7s` · ×1.4 (87 583₽ → 122 912₽)

| Цена, ₽ | Диаг. | Название | Артикул |
|---------|-------|----------|---------|
| 87 583 | 65" | / Телевизор смарт 65 дюймов 65U7S черный | [980678340](https://www.wildberries.ru/catalog/980678340/detail.aspx) |
| 122 912 | 65" | / Телевизор смарт 65 дюймов 65U7S PRO черный | [1051364652](https://www.wildberries.ru/catalog/1051364652/detail.aspx) |
| 122 912 | 65" | / Телевизор смарт 65 дюймов 65U7S PRO черный | [1051366312](https://www.wildberries.ru/catalog/1051366312/detail.aspx) |

### `samsung|ue55u8000fuxru` · ×1.4 (39 233₽ → 54 990₽)

| Цена, ₽ | Диаг. | Название | Артикул |
|---------|-------|----------|---------|
| 39 233 | 55" | / 55" Телевизор UE55U8000FUXRU, без ПО | [569423883](https://www.wildberries.ru/catalog/569423883/detail.aspx) |
| 39 859 | 55" | / Телевизор 4К UE55U8000FUXRU 55", UHD, 60 Гц | [693156022](https://www.wildberries.ru/catalog/693156022/detail.aspx) |
| 46 735 | 55" | / Телевизор смарт 55 дюймов UE55U8000FUXRU черный | [463064681](https://www.wildberries.ru/catalog/463064681/detail.aspx) |
| 54 990 | 55" | / Телевизор 4К UE55U8000FUXRU 55", UHD, 60 Гц | [466481345](https://www.wildberries.ru/catalog/466481345/detail.aspx) |

## 6. Премиум-бренд по подозрительно низкой цене (< 60% медианы) — 5

| Цена, ₽ | Медиана диаг. | Диаг. | Бренд | Название | Артикул |
|----------|----------------|--------|--------|-----------|----------|
| 110 408 | 545 726 | 85" | Samsung | / Телевизор 4К QE85Q7FAAUXRU 85", HDR, 60 Гц | [693156299](https://www.wildberries.ru/catalog/693156299/detail.aspx) |
| 297 943 | 529 990 | 77" | Samsung | / Телевизор 4К QE77S90FAEXRU 77", OLED HDR+, 120 Гц | [693156043](https://www.wildberries.ru/catalog/693156043/detail.aspx) |
| 159 991 | 545 726 | 85" | TCL | / Телевизор 85 дюймов смарт 4K 85P8L (2026) | [969774224](https://www.wildberries.ru/catalog/969774224/detail.aspx) |
| 88 089 | 545 726 | 85" | Samsung | / Телевизор LED 85" UE85U8000FUXCE 4K Ultra HD Smart TV | [784441483](https://www.wildberries.ru/catalog/784441483/detail.aspx) |
| 185 665 | 545 726 | 85" | LG | / Телевизор 85QNED93A6A, QNED, ИИ процессор 8 Gen2 | [575747044](https://www.wildberries.ru/catalog/575747044/detail.aspx) |

## 7-8. Трендовые аномалии

_Предыдущий снимок не передан (--prev). Положите свежий REPORT.json в `report/history/` и в следующий запуск передайте его — появятся секции «резко подешевело» / «резко подорожало»._

---
_Сгенерировано `scripts/anomalies.mjs`. Severity high = sentinel/placeholder + экстремальные ценовые выбросы; medium = фейк-скидки, премиум-аномалии, трендовые скачки; low = умеренные выбросы, дубликаты._