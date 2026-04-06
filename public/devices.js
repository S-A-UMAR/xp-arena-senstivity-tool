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
                    { name: "iPhone 8 Plus", ram: 3 }, { name: "iPhone 7 Plus", ram: 3 }
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
                    { name: "iPhone 12 Pro", ram: 6 }, { name: "iPhone 12", ram: 4 },
                    { name: "iPhone 11 Pro", ram: 4 }, { name: "iPhone 11", ram: 4 }
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
                    { name: "Galaxy S25 Ultra", ram: 16 }, { name: "Galaxy S25+", ram: 12 },
                    { name: "Galaxy S24 Ultra", ram: 12 }, { name: "Galaxy S24+", ram: 12 },
                    { name: "Galaxy S23 Ultra", ram: 12 }, { name: "Galaxy S22 Ultra", ram: 12 },
                    { name: "Galaxy S21 Ultra", ram: 12 }, { name: "Galaxy S20 Ultra", ram: 12 }
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
                    { name: "Xiaomi 15 Ultra", ram: 16 }, { name: "Xiaomi 14 Ultra", ram: 16 },
                    { name: "Xiaomi 13 Ultra", ram: 12 }, { name: "Xiaomi 12 Pro", ram: 12 }
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
                    { name: "RedMagic 10 Pro+", ram: 24 }, { name: "RedMagic 9S Pro+", ram: 16 },
                    { name: "RedMagic 8 Pro", ram: 12 }, { name: "RedMagic 7 Pro", ram: 12 }
                ]
            }
        ]
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = devices;
}
