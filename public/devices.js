const devices = [
    {
        brand: "Apple",
        series: [
            {
                name: "iPhone Pro Max/Plus Series",
                models: [
                    { name: "iPhone 17 Pro Max", ram: 12 }, { name: "iPhone 17 Plus", ram: 8 },
                    { name: "iPhone 16 Pro Max", ram: 8 }, { name: "iPhone 16 Plus", ram: 8 },
                    { name: "iPhone 15 Pro Max", ram: 8 }, { name: "iPhone 15 Plus", ram: 6 },
                    { name: "iPhone 14 Pro Max", ram: 6 }, { name: "iPhone 14 Plus", ram: 6 },
                    { name: "iPhone 13 Pro Max", ram: 6 }, { name: "iPhone 12 Pro Max", ram: 6 },
                    { name: "iPhone 11 Pro Max", ram: 4 }, { name: "iPhone XS Max", ram: 4 },
                    { name: "iPhone 8 Plus", ram: 3 }, { name: "iPhone 7 Plus", ram: 3 },
                    { name: "iPhone 6s Plus", ram: 2 }, { name: "iPhone 6 Plus", ram: 1 }
                ]
            },
            {
                name: "iPhone standard/Pro/Mini",
                models: [
                    { name: "iPhone 17 Pro", ram: 12 }, { name: "iPhone 17", ram: 8 },
                    { name: "iPhone 16 Pro", ram: 8 }, { name: "iPhone 16", ram: 8 },
                    { name: "iPhone 15 Pro", ram: 8 }, { name: "iPhone 15", ram: 6 },
                    { name: "iPhone 14 Pro", ram: 6 }, { name: "iPhone 14", ram: 6 },
                    { name: "iPhone 13 Pro", ram: 6 }, { name: "iPhone 13", ram: 4 },
                    { name: "iPhone 13 Mini", ram: 4 }, { name: "iPhone 12 Pro", ram: 6 },
                    { name: "iPhone 12", ram: 4 }, { name: "iPhone 12 Mini", ram: 4 },
                    { name: "iPhone 11 Pro", ram: 4 }, { name: "iPhone 11", ram: 4 },
                    { name: "iPhone XR", ram: 3 }, { name: "iPhone X", ram: 3 },
                    { name: "iPhone XS", ram: 4 }, { name: "iPhone 8", ram: 2 },
                    { name: "iPhone 7", ram: 2 }, { name: "iPhone 6s", ram: 2 },
                    { name: "iPhone 6", ram: 1 }, { name: "iPhone 5s", ram: 1 },
                    { name: "iPhone SE (3rd Gen)", ram: 4 }, { name: "iPhone SE (2nd Gen)", ram: 3 },
                    { name: "iPhone SE (1st Gen)", ram: 2 }
                ]
            },
            {
                name: "iPad Pro Series",
                models: [
                    { name: "iPad Pro 13-inch (M4)", ram: 16 }, { name: "iPad Pro 11-inch (M4)", ram: 16 },
                    { name: "iPad Pro 12.9 (6th Gen)", ram: 8 }, { name: "iPad Pro 11 (4th Gen)", ram: 8 },
                    { name: "iPad Pro 12.9 (5th Gen)", ram: 8 }, { name: "iPad Pro 11 (3rd Gen)", ram: 8 },
                    { name: "iPad Pro 10.5", ram: 4 }, { name: "iPad Pro 9.7", ram: 2 }
                ]
            }
        ]
    },
    {
        brand: "Samsung",
        series: [
            {
                name: "Galaxy S Series",
                models: [
                    { name: "Galaxy S26 Ultra (Concept)", ram: 16 }, { name: "Galaxy S26+", ram: 12 }, { name: "Galaxy S26", ram: 12 },
                    { name: "Galaxy S25 Ultra", ram: 16 }, { name: "Galaxy S25+", ram: 12 }, { name: "Galaxy S25", ram: 12 },
                    { name: "Galaxy S24 Ultra", ram: 12 }, { name: "Galaxy S24+", ram: 12 }, { name: "Galaxy S24", ram: 8 },
                    { name: "Galaxy S23 Ultra", ram: 12 }, { name: "Galaxy S23+", ram: 8 }, { name: "Galaxy S23", ram: 8 },
                    { name: "Galaxy S22 Ultra", ram: 12 }, { name: "Galaxy S22+", ram: 8 }, { name: "Galaxy S22", ram: 8 },
                    { name: "Galaxy S21 Ultra", ram: 12 }, { name: "Galaxy S21 FE", ram: 8 }, { name: "Galaxy S20 Ultra", ram: 12 }
                ]
            },
            {
                name: "Galaxy Z Fold/Flip",
                models: [
                    { name: "Galaxy Z Fold 7", ram: 16 }, { name: "Galaxy Z Fold 6", ram: 12 }, { name: "Galaxy Z Fold 5", ram: 12 },
                    { name: "Galaxy Z Flip 7", ram: 12 }, { name: "Galaxy Z Flip 6", ram: 12 }, { name: "Galaxy Z Flip 5", ram: 8 }
                ]
            },
            {
                name: "Galaxy Note Series",
                models: [
                    { name: "Galaxy Note 20 Ultra", ram: 12 }, { name: "Galaxy Note 20", ram: 8 }, { name: "Galaxy Note 10+", ram: 12 },
                    { name: "Galaxy Note 10", ram: 8 }, { name: "Galaxy Note 9", ram: 6 }, { name: "Galaxy Note 8", ram: 6 }
                ]
            },
            {
                name: "Galaxy A Series",
                models: [
                    { name: "Galaxy A56", ram: 12 }, { name: "Galaxy A55", ram: 12 }, { name: "Galaxy A54", ram: 8 },
                    { name: "Galaxy A53", ram: 8 }, { name: "Galaxy A52s", ram: 8 }, { name: "Galaxy A35", ram: 8 },
                    { name: "Galaxy A15", ram: 6 }, { name: "Galaxy A05s", ram: 4 }
                ]
            }
        ]
    },
    {
        brand: "Xiaomi",
        series: [
            {
                name: "Xiaomi/Mi Series",
                models: [
                    { name: "Xiaomi 15 Ultra", ram: 16 }, { name: "Xiaomi 15 Pro", ram: 16 }, { name: "Xiaomi 15", ram: 12 },
                    { name: "Xiaomi 14 Ultra", ram: 16 }, { name: "Xiaomi 14 Pro", ram: 12 }, { name: "Xiaomi 14", ram: 12 },
                    { name: "Xiaomi 13T Pro", ram: 16 }, { name: "Xiaomi 12T Pro", ram: 12 }, { name: "Mi 11 Ultra", ram: 12 }
                ]
            },
            {
                name: "Xiaomi Pad Series",
                models: [
                    { name: "Xiaomi Pad 7 Pro", ram: 16 }, { name: "Xiaomi Pad 7", ram: 12 }, { name: "Xiaomi Pad 6S Pro", ram: 16 },
                    { name: "Xiaomi Pad 6 Pro", ram: 12 }, { name: "Xiaomi Pad 6", ram: 8 }
                ]
            }
        ]
    },
    {
        brand: "Redmi",
        series: [
            {
                name: "Redmi K Series",
                models: [
                    { name: "Redmi K80 Pro", ram: 16 }, { name: "Redmi K80", ram: 12 }, { name: "Redmi K70 Ultra", ram: 16 },
                    { name: "Redmi K70 Pro", ram: 12 }, { name: "Redmi K60 Ultra", ram: 16 }, { name: "Redmi K50 Gaming", ram: 12 }
                ]
            },
            {
                name: "Redmi Note Series",
                models: [
                    { name: "Redmi Note 14 Pro+", ram: 16 }, { name: "Redmi Note 14 Pro", ram: 12 }, { name: "Redmi Note 13 Pro+", ram: 16 },
                    { name: "Redmi Note 12 Turbo", ram: 12 }, { name: "Redmi Note 11 Pro+", ram: 8 }
                ]
            }
        ]
    },
    {
        brand: "Oppo",
        series: [
            {
                name: "Find X Series",
                models: [
                    { name: "Find X8 Ultra", ram: 16 }, { name: "Find X8 Pro", ram: 16 }, { name: "Find X8", ram: 12 },
                    { name: "Find X7 Ultra", ram: 16 }, { name: "Find X6 Pro", ram: 12 }, { name: "Find X5 Pro", ram: 12 }
                ]
            },
            {
                name: "Reno Series",
                models: [
                    { name: "Reno 13 Pro", ram: 12 }, { name: "Reno 13", ram: 12 }, { name: "Reno 12 Pro", ram: 12 },
                    { name: "Reno 11 Pro", ram: 12 }, { name: "Reno 10 Pro+", ram: 12 }, { name: "Reno Ace 2", ram: 12 }
                ]
            }
        ]
    },
    {
        brand: "Realme",
        series: [
            {
                name: "GT Series",
                models: [
                    { name: "Realme GT 7 Pro", ram: 16 }, { name: "Realme GT 6", ram: 16 }, { name: "Realme GT 6T", ram: 12 },
                    { name: "Realme GT 5 Pro", ram: 16 }, { name: "Realme GT Neo 6", ram: 16 }, { name: "Realme GT 2 Pro", ram: 12 }
                ]
            },
            {
                name: "Realme Number Series",
                models: [
                    { name: "Realme 13 Pro+", ram: 12 }, { name: "Realme 12 Pro+", ram: 12 }, { name: "Realme 11 Pro+", ram: 12 },
                    { name: "Realme 10 Pro+", ram: 12 }, { name: "Realme 9 Pro+", ram: 8 }
                ]
            }
        ]
    },
    {
        brand: "Vivo",
        series: [
            {
                name: "X Series",
                models: [
                    { name: "Vivo X200 Ultra", ram: 16 }, { name: "Vivo X200 Pro", ram: 16 }, { name: "Vivo X100 Ultra", ram: 16 },
                    { name: "Vivo X90 Pro+", ram: 12 }, { name: "Vivo X80 Pro", ram: 12 }
                ]
            },
            {
                name: "iQOO Series",
                models: [
                    { name: "iQOO 13", ram: 16 }, { name: "iQOO 12 Pro", ram: 16 }, { name: "iQOO 11 Pro", ram: 16 },
                    { name: "iQOO Neo 9 Pro", ram: 12 }, { name: "iQOO Z9 Turbo", ram: 12 }
                ]
            }
        ]
    },
    {
        brand: "Asus",
        series: [
            {
                name: "ROG Phone Series",
                models: [
                    { name: "ROG Phone 9 Pro", ram: 24 }, { name: "ROG Phone 9", ram: 16 }, { name: "ROG Phone 8 Pro", ram: 24 },
                    { name: "ROG Phone 7 Ultimate", ram: 16 }, { name: "ROG Phone 6 Pro", ram: 18 }, { name: "ROG Phone 5s Pro", ram: 18 }
                ]
            },
            {
                name: "Zenfone Series",
                models: [
                    { name: "Zenfone 11 Ultra", ram: 16 }, { name: "Zenfone 10", ram: 16 }, { name: "Zenfone 9", ram: 16 }
                ]
            }
        ]
    },
    {
        brand: "Nubia / RedMagic",
        series: [
            {
                name: "RedMagic Series",
                models: [
                    { name: "RedMagic 10 Pro+", ram: 24 }, { name: "RedMagic 10 Pro", ram: 16 }, { name: "RedMagic 9S Pro+", ram: 16 },
                    { name: "RedMagic 9 Pro+", ram: 16 }, { name: "RedMagic 8 Pro", ram: 12 }, { name: "RedMagic 7 Pro", ram: 12 }
                ]
            },
            {
                name: "Nubia Z Series",
                models: [
                    { name: "Nubia Z70 Ultra", ram: 16 }, { name: "Nubia Z60 Ultra", ram: 16 }, { name: "Nubia Z50 Ultra", ram: 16 }
                ]
            }
        ]
    },
    {
        brand: "Poco",
        series: [
            {
                name: "Poco F Series",
                models: [
                    { name: "Poco F6 Pro", ram: 16 }, { name: "Poco F6", ram: 12 }, { name: "Poco F5 Pro", ram: 12 },
                    { name: "Poco F4 GT", ram: 12 }, { name: "Poco F3 GT", ram: 12 }
                ]
            },
            {
                name: "Poco X Series",
                models: [
                    { name: "Poco X6 Pro", ram: 12 }, { name: "Poco X5 Pro", ram: 8 }, { name: "Poco X4 GT", ram: 8 },
                    { name: "Poco X3 Pro", ram: 8 }
                ]
            }
        ]
    },
    {
        brand: "Infinix",
        series: [
            {
                name: "Zero Series",
                models: [
                    { name: "Zero 40 5G", ram: 12 }, { name: "Zero 30 5G", ram: 12 }, { name: "Zero Ultra", ram: 8 }
                ]
            },
            {
                name: "GT/Hot Series",
                models: [
                    { name: "GT 20 Pro", ram: 12 }, { name: "GT 10 Pro", ram: 8 }, { name: "Hot 50 Pro+", ram: 8 }
                ]
            }
        ]
    },
    {
        brand: "Black Shark",
        series: [
            {
                name: "Black Shark 5 Series",
                models: [
                    { name: "Black Shark 5 Pro", ram: 16 }, { name: "Black Shark 5", ram: 12 }, { name: "Black Shark 5 RS", ram: 12 }
                ]
            },
            {
                name: "Black Shark 4 Series",
                models: [
                    { name: "Black Shark 4 Pro", ram: 12 }, { name: "Black Shark 4S Pro", ram: 12 }, { name: "Black Shark 4", ram: 8 }
                ]
            }
        ]
    },
    {
        brand: "Lenovo",
        series: [
            {
                name: "Legion Phone Duel Series",
                models: [
                    { name: "Lenovo Legion Phone Duel 2", ram: 16 }, { name: "Legion Phone Duel", ram: 12 }
                ]
            }
        ]
    },
    {
        brand: "Google",
        series: [
            {
                name: "Pixel Pro/Ultra Series",
                models: [
                    { name: "Pixel 9 Pro XL", ram: 16 }, { name: "Pixel 9 Pro", ram: 16 }, { name: "Pixel 8 Pro", ram: 12 }, { name: "Pixel 7 Pro", ram: 12 }
                ]
            }
        ]
    },
    {
        brand: "OnePlus",
        series: [
            {
                name: "Number/R Series",
                models: [
                    { name: "OnePlus 13", ram: 16 }, { name: "OnePlus 12", ram: 16 }, { name: "OnePlus 11", ram: 16 }, { name: "OnePlus 10 Pro", ram: 12 }
                ]
            }
        ]
    }
];

// Dynamically adding the remaining 15 brands with their core series
const extraBrands = [
    { brand: "Motorola", series: "Edge Series", models: ["Edge 50 Ultra", "Edge 40 Pro", "Edge 30 Ultra"] },
    { brand: "Sony", series: "Xperia 1 Series", models: ["Xperia 1 VI", "Xperia 1 V", "Xperia 1 IV"] },
    { brand: "Huawei", series: "Pura Series", models: ["Pura 70 Ultra", "P60 Pro", "P50 Pro"] },
    { brand: "Honor", series: "Magic Series", models: ["Magic 7 Pro", "Magic 6 Pro", "Magic 5 Pro"] },
    { brand: "Nothing", series: "Phone Series", models: ["Nothing Phone (2)", "Nothing Phone (1)", "CMF Phone 1"] },
    { brand: "Tecno", series: "Phantom Series", models: ["Phantom V Fold 2", "Phantom X2 Pro"] },
    { brand: "Meizu", series: "Meizu Number Series", models: ["Meizu 21 Pro", "Meizu 20 Pro"] },
    { brand: "ZTE", series: "Axon Series", models: ["Axon 60 Ultra", "Axon 50 Ultra"] },
    { brand: "Nokia", series: "X/G Series", models: ["Nokia XR21", "Nokia X30"] },
    { brand: "HTC", series: "U Series", models: ["HTC U23 Pro", "HTC U20 5G"] },
    { brand: "Blackview", series: "BV/BL Series", models: ["BL9000 Pro", "BV9300"] },
    { brand: "Ulefone", series: "Armor Series", models: ["Armor 26 Ultra", "Armor 23 Ultra"] },
    { brand: "Doogee", series: "V/S Series", models: ["V31 GT", "S110"] },
    { brand: "Itel", series: "S/P Series", models: ["S24", "P55+"] },
    { brand: "Sharp", series: "AQUOS R Series", models: ["AQUOS R9", "AQUOS R8 Pro"] }
];

extraBrands.forEach(b => {
    devices.push({
        brand: b.brand,
        series: [{
            name: b.series,
            models: b.models.map(m => ({ name: m, ram: 12 }))
        }]
    });
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = devices;
}
window.devices = devices;
