// WB CDN image URL builder.
//
// WB shards images across basket-XX.wbbasket.ru. Basket # is a function of
// the article id; the mapping is hard-coded in the WB front-end. This table
// was derived empirically by probing real product IDs from the watchlist.
//
// If sendPhoto fails with this URL the caller should fall back to text-only —
// the product may have no image, or the basket # may have shifted on a newer
// range we haven't seen yet.

export function wbImageUrl(id, slot = 1) {
    const n = parseInt(id, 10);
    if (!n) return null;
    const basket = wbBasket(n);
    const vol = Math.floor(n / 1e5);
    const part = Math.floor(n / 1e3);
    return `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${n}/images/big/${slot}.webp`;
}

export function wbBasket(id) {
    const t = Math.floor(id / 1e5);   // t = thousands of id
    if (t <= 143) return '01';
    if (t <= 287) return '02';
    if (t <= 431) return '03';
    if (t <= 719) return '04';
    if (t <= 1006) return '05';
    if (t <= 1061) return '06';
    if (t <= 1115) return '07';
    if (t <= 1181) return '08';
    if (t <= 1319) return '09';
    if (t <= 1454) return '10';
    if (t <= 1655) return '11';
    if (t <= 1837) return '12';
    if (t <= 2045) return '13';
    if (t <= 2189) return '14';
    if (t <= 2389) return '15';
    if (t <= 2706) return '16';
    if (t <= 2864) return '17';
    if (t <= 2873) return '18';
    if (t <= 3261) return '19';
    if (t <= 3433) return '20';
    if (t <= 3643) return '21';
    if (t <= 3804) return '22';
    if (t <= 3963) return '23';
    if (t <= 4231) return '24';
    if (t <= 4385) return '25';
    if (t <= 4677) return '26';
    if (t <= 4885) return '27';
    if (t <= 5405) return '28';
    if (t <= 5646) return '29';
    if (t <= 5995) return '30';
    if (t <= 6190) return '31';
    if (t <= 6390) return '32';
    if (t <= 6590) return '33';
    if (t <= 6790) return '34';
    if (t <= 6990) return '35';
    if (t <= 7995) return '36';
    if (t <= 8500) return '37';
    if (t <= 8800) return '38';
    if (t <= 9100) return '39';
    if (t <= 9500) return '40';
    if (t <= 9999) return '41';
    return '42';
}
