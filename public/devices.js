const devices = [
    {
        brand: "Apple",
        series: [
            {
                name: "iPhone Pro Max/Plus Series",
                models: [
                    "iPhone 17 Pro Max", "iPhone 17 Plus", "iPhone 16 Pro Max", "iPhone 16 Plus",
                    "iPhone 15 Pro Max", "iPhone 15 Plus", "iPhone 14 Pro Max", "iPhone 14 Plus",
                    "iPhone 13 Pro Max", "iPhone 12 Pro Max", "iPhone 11 Pro Max",
                    "iPhone XS Max", "iPhone 8 Plus", "iPhone 7 Plus", "iPhone 6s Plus", "iPhone 6 Plus"
                ]
            },
            {
                name: "iPhone standard/Pro/Mini",
                models: [
                    "iPhone 17 Pro", "iPhone 17", "iPhone 16 Pro", "iPhone 16",
                    "iPhone 15 Pro", "iPhone 15", "iPhone 14 Pro", "iPhone 14",
                    "iPhone 13 Pro", "iPhone 13", "iPhone 13 Mini",
                    "iPhone 12 Pro", "iPhone 12", "iPhone 12 Mini",
                    "iPhone 11 Pro", "iPhone 11", "iPhone XR", "iPhone X", "iPhone XS",
                    "iPhone 8", "iPhone 7", "iPhone 6s", "iPhone 6", "iPhone 5s", "iPhone 5c", "iPhone 5",
                    "iPhone SE (3rd Gen)", "iPhone SE (2nd Gen)", "iPhone SE (1st Gen)",
                    "iPhone 4s", "iPhone 4", "iPhone 3GS", "iPhone 3G", "iPhone 2G"
                ]
            },
            {
                name: "iPad Pro Series",
                models: [
                    "iPad Pro 13-inch (M4)", "iPad Pro 11-inch (M4)", 
                    "iPad Pro 12.9 (6th Gen)", "iPad Pro 11 (4th Gen)",
                    "iPad Pro 12.9 (5th Gen)", "iPad Pro 11 (3rd Gen)",
                    "iPad Pro 12.9 (4th Gen)", "iPad Pro 11 (2nd Gen)",
                    "iPad Pro 12.9 (3rd Gen)", "iPad Pro 11 (1st Gen)",
                    "iPad Pro 12.9 (2nd Gen)", "iPad Pro 10.5", "iPad Pro 9.7"
                ]
            },
            {
                name: "iPad Air/Mini/Standard",
                models: [
                    "iPad Air (M2)", "iPad Air (5th Gen)", "iPad Air (4th Gen)", "iPad Air (3rd Gen)", "iPad Air 2", "iPad Air",
                    "iPad Mini (7th Gen)", "iPad Mini (6th Gen)", "iPad Mini (5th Gen)", "iPad Mini 4", "iPad Mini 3", "iPad Mini 2", "iPad Mini",
                    "iPad (10th Gen)", "iPad (9th Gen)", "iPad (8th Gen)", "iPad (7th Gen)", "iPad (6th Gen)", "iPad (5th Gen)", "iPad (4th Gen)", "iPad (3rd Gen)", "iPad 2", "iPad"
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
                    "Galaxy S26 Ultra (Concept)", "Galaxy S26+", "Galaxy S26",
                    "Galaxy S25 Ultra", "Galaxy S25+", "Galaxy S25", 
                    "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", 
                    "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23", 
                    "Galaxy S22 Ultra", "Galaxy S22+", "Galaxy S22", 
                    "Galaxy S21 Ultra", "Galaxy S21+", "Galaxy S21", "Galaxy S21 FE", 
                    "Galaxy S20 Ultra", "Galaxy S20+", "Galaxy S20", "Galaxy S20 FE", 
                    "Galaxy S10+", "Galaxy S10", "Galaxy S10e", "Galaxy S10 Lite",
                    "Galaxy S9+", "Galaxy S9", "Galaxy S8+", "Galaxy S8", "Galaxy S7 Edge", "Galaxy S7", 
                    "Galaxy S6 Edge+", "Galaxy S6 Edge", "Galaxy S6", "Galaxy S5", "Galaxy S4", "Galaxy S3", "Galaxy S2", "Galaxy S"
                ]
            },
            {
                name: "Galaxy Z Fold/Flip",
                models: [
                    "Galaxy Z Fold 7", "Galaxy Z Fold 6", "Galaxy Z Fold 5", "Galaxy Z Fold 4", "Galaxy Z Fold 3", "Galaxy Z Fold 2", "Galaxy Fold",
                    "Galaxy Z Flip 7", "Galaxy Z Flip 6", "Galaxy Z Flip 5", "Galaxy Z Flip 4", "Galaxy Z Flip 3", "Galaxy Z Flip 5G", "Galaxy Z Flip",
                    "Galaxy W25", "Galaxy W24", "Galaxy W23"
                ]
            },
            {
                name: "Galaxy Note Series",
                models: [
                    "Galaxy Note 20 Ultra", "Galaxy Note 20", "Galaxy Note 10+", "Galaxy Note 10", "Galaxy Note 10 Lite",
                    "Galaxy Note 9", "Galaxy Note 8", "Galaxy Note 7", "Galaxy Note 5", "Galaxy Note 4", "Galaxy Note 3", "Galaxy Note 2", "Galaxy Note"
                ]
            },
            {
                name: "Galaxy A Series",
                models: [
                    "Galaxy A56", "Galaxy A55", "Galaxy A54", "Galaxy A53", "Galaxy A52s", "Galaxy A52", "Galaxy A51", "Galaxy A50s", "Galaxy A50",
                    "Galaxy A36", "Galaxy A35", "Galaxy A34", "Galaxy A33", "Galaxy A32", "Galaxy A31", "Galaxy A30s", "Galaxy A30",
                    "Galaxy A26", "Galaxy A25", "Galaxy A24", "Galaxy A23", "Galaxy A22", "Galaxy A21s", "Galaxy A21", "Galaxy A20s", "Galaxy A20",
                    "Galaxy A16", "Galaxy A15", "Galaxy A14", "Galaxy A13", "Galaxy A12", "Galaxy A11", "Galaxy A10s", "Galaxy A10",
                    "Galaxy A06", "Galaxy A05s", "Galaxy A05", "Galaxy A04s", "Galaxy A04", "Galaxy A03s", "Galaxy A03", "Galaxy A02s", "Galaxy A02",
                    "Galaxy A73", "Galaxy A72", "Galaxy A71", "Galaxy A70", "Galaxy A80", "Galaxy A90 5G", "Galaxy A8s", "Galaxy A9 (2018)",
                    "Galaxy A8 (2018)", "Galaxy A7 (2018)", "Galaxy A6+", "Galaxy A5 (2017)", "Galaxy A3 (2017)"
                ]
            },
            {
                name: "Galaxy M/F Series",
                models: [
                    "Galaxy M55", "Galaxy M54", "Galaxy M53", "Galaxy M52", "Galaxy M51", "Galaxy M35", "Galaxy M34", "Galaxy M33", "Galaxy M32", "Galaxy M31s", "Galaxy M31",
                    "Galaxy M15", "Galaxy M14", "Galaxy M13", "Galaxy M12", "Galaxy M11", "Galaxy M04", "Galaxy M02", "Galaxy M01",
                    "Galaxy F62", "Galaxy F54", "Galaxy F44", "Galaxy F34", "Galaxy F23", "Galaxy F15", "Galaxy F14", "Galaxy F13", "Galaxy F04"
                ]
            },
            {
                name: "Galaxy Tab Series",
                models: [
                    "Galaxy Tab S10 Ultra", "Galaxy Tab S10+", "Galaxy Tab S9 Ultra", "Galaxy Tab S9+", "Galaxy Tab S9", "Galaxy Tab S9 FE",
                    "Galaxy Tab S8 Ultra", "Galaxy Tab S8+", "Galaxy Tab S8",
                    "Galaxy Tab S7+", "Galaxy Tab S7", "Galaxy Tab S7 FE",
                    "Galaxy Tab S6 Lite", "Galaxy Tab S6", "Galaxy Tab S5e", "Galaxy Tab S4", "Galaxy Tab S3", "Galaxy Tab S2",
                    "Galaxy Tab A9+", "Galaxy Tab A9", "Galaxy Tab A8", "Galaxy Tab A7", "Galaxy Tab A7 Lite", "Galaxy Tab A 10.1", "Galaxy Tab A 8.0"
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
                    "Xiaomi 15 Ultra", "Xiaomi 15 Pro", "Xiaomi 15", "Xiaomi 14 Ultra", "Xiaomi 14 Pro", "Xiaomi 14", "Xiaomi 14 Civi",
                    "Xiaomi 13T Pro", "Xiaomi 13T", "Xiaomi 13 Ultra", "Xiaomi 13 Pro", "Xiaomi 13", "Xiaomi 13 Lite",
                    "Xiaomi 12T Pro", "Xiaomi 12T", "Xiaomi 12S Ultra", "Xiaomi 12 Pro", "Xiaomi 12", "Xiaomi 12 Lite",
                    "Xiaomi 11T Pro", "Xiaomi 11T", "Mi 11 Ultra", "Mi 11", "Mi 11i", "Mi 11 Lite 5G NE", "Mi 11 Lite 5G", "Mi 11 Lite",
                    "Mi 10T Pro", "Mi 10T", "Mi 10T Lite", "Mi 10 Pro", "Mi 10", "Mi 10 Lite", "Mi 10i", "Mi 10S",
                    "Mi 9T Pro", "Mi 9T", "Mi 9 Pro", "Mi 9", "Mi 9 SE", "Mi 9 Lite",
                    "Mi 8 Pro", "Mi 8", "Mi 8 SE", "Mi 8 Lite", "Mi 8 Explorer",
                    "Mi Mix 4", "Mi Mix 3 5G", "Mi Mix 3", "Mi Mix 2S", "Mi Mix 2", "Mi Mix", "Mi Mix Alpha",
                    "Mi Note 10 Pro", "Mi Note 10", "Mi Note 10 Lite", "Mi Note 3", "Mi Note 2"
                ]
            },
            {
                name: "Xiaomi Pad Series",
                models: ["Xiaomi Pad 7 Pro", "Xiaomi Pad 7", "Xiaomi Pad 6S Pro", "Xiaomi Pad 6 Pro", "Xiaomi Pad 6", "Xiaomi Pad 5 Pro", "Xiaomi Pad 5", "Mi Pad 4", "Mi Pad 4 Plus"]
            }
        ]
    },
    {
        brand: "Redmi",
        series: [
            {
                name: "Redmi K Series",
                models: [
                    "Redmi K80 Pro", "Redmi K80", "Redmi K70 Ultra", "Redmi K70 Pro", "Redmi K70", "Redmi K70E",
                    "Redmi K60 Ultra", "Redmi K60 Pro", "Redmi K60", "Redmi K60E",
                    "Redmi K50 Ultra", "Redmi K50 Pro", "Redmi K50 Gaming", "Redmi K50", "Redmi K50i",
                    "Redmi K40 Pro+", "Redmi K40 Pro", "Redmi K40 Gaming", "Redmi K40", "Redmi K40S",
                    "Redmi K30 Pro Zoom", "Redmi K30 Pro", "Redmi K30 Ultra", "Redmi K30S", "Redmi K30 5G", "Redmi K30i", "Redmi K30",
                    "Redmi K20 Pro Premium", "Redmi K20 Pro", "Redmi K20"
                ]
            },
            {
                name: "Redmi Note Series",
                models: [
                    "Redmi Note 14 Pro+", "Redmi Note 14 Pro", "Redmi Note 14",
                    "Redmi Note 13 Pro+", "Redmi Note 13 Pro", "Redmi Note 13 5G", "Redmi Note 13 4G", "Redmi Note 13R Pro",
                    "Redmi Note 12 Pro+ Speed", "Redmi Note 12 Pro+", "Redmi Note 12 Pro", "Redmi Note 12S", "Redmi Note 12 5G", "Redmi Note 12 4G", "Redmi Note 12 Turbo", "Redmi Note 12R",
                    "Redmi Note 11 Pro+ 5G", "Redmi Note 11 Pro 5G", "Redmi Note 11 Pro", "Redmi Note 11S 5G", "Redmi Note 11S", "Redmi Note 11", "Redmi Note 11E Pro", "Redmi Note 11T Pro+", "Redmi Note 11T Pro", "Redmi Note 11R",
                    "Redmi Note 10 Pro Max", "Redmi Note 10 Pro", "Redmi Note 10S", "Redmi Note 10", "Redmi Note 10 5G", "Redmi Note 10T", "Redmi Note 10 JE",
                    "Redmi Note 9 Pro Max", "Redmi Note 9 Pro", "Redmi Note 9S", "Redmi Note 9", "Redmi Note 9 5G", "Redmi Note 9T", "Redmi Note 9 4G",
                    "Redmi Note 8 Pro", "Redmi Note 8 (2021)", "Redmi Note 8", "Redmi Note 8T",
                    "Redmi Note 7 Pro", "Redmi Note 7", "Redmi Note 7S", "Redmi Note 6 Pro", "Redmi Note 5 Pro", "Redmi Note 5", "Redmi Note 4", "Redmi Note 3"
                ]
            },
            {
                name: "Redmi Turbo/Turbo Series",
                models: ["Redmi Turbo 3"]
            },
            {
                name: "Redmi standard/A/C Series",
                models: [
                    "Redmi 13C 5G", "Redmi 13C", "Redmi 13", "Redmi 13R", "Redmi 12 5G", "Redmi 12", "Redmi 12C",
                    "Redmi 10 5G", "Redmi 10 (2022)", "Redmi 10", "Redmi 10C", "Redmi 10A", "Redmi 10 Prime",
                    "Redmi 9T", "Redmi 9C NFC", "Redmi 9C", "Redmi 9A", "Redmi 9", "Redmi 9 Prime", "Redmi 9i", "Redmi 9 Power",
                    "Redmi 8", "Redmi 8A Dual", "Redmi 8A Pro", "Redmi 8A", "Redmi 7", "Redmi 7A", "Redmi 6 Pro", "Redmi 6", "Redmi 6A",
                    "Redmi 5 Plus", "Redmi 5", "Redmi 5A", "Redmi 4X", "Redmi 4A", "Redmi 3S",
                    "Redmi A3", "Redmi A3x", "Redmi A2+", "Redmi A2", "Redmi A1+", "Redmi A1"
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
                    "Find X8 Ultra", "Find X8 Pro", "Find X8", "Find X7 Ultra", "Find X7", "Find X6 Pro", "Find X6", "Find X5 Pro", "Find X5", "Find X5 Lite", "Find X3 Pro", "Find X3 Neo", "Find X3 Lite", "Find X2 Pro", "Find X2", "Find X"
                ]
            },
            {
                name: "Reno Series",
                models: [
                    "Reno 13 Pro", "Reno 13", "Reno 12 Pro", "Reno 12", "Reno 12F", "Reno 12FS", "Reno 11 Pro", "Reno 11", "Reno 11F", "Reno 10 Pro+", "Reno 10 Pro", "Reno 10", "Reno 9 Pro+", "Reno 9 Pro", "Reno 9", "Reno 8 Pro", "Reno 8", "Reno 8T", "Reno 7 Pro", "Reno 7", "Reno 6 Pro", "Reno 6", "Reno 5 Pro", "Reno 5", "Reno 4 Pro", "Reno 4", "Reno 3 Pro", "Reno 3", "Reno 2", "Reno 2Z", "Reno 2F", "Reno Ace", "Reno Ace 2"
                ]
            },
            {
                name: "Oppo A Series",
                models: [
                    "Oppo A3 Pro", "Oppo A3", "Oppo A60", "Oppo A59", "Oppo A58", "Oppo A79", "Oppo A78", "Oppo A98", "Oppo A77", "Oppo A57", "Oppo A96", "Oppo A76", "Oppo A55", "Oppo A54", "Oppo A16", "Oppo A15", "Oppo A94", "Oppo A74", "Oppo A53", "Oppo A52", "Oppo A31", "Oppo A92", "Oppo A72", "Oppo A52", "Oppo A91", "Oppo A9 (2020)", "Oppo A5 (2020)", "Oppo A7", "Oppo A5s", "Oppo A3s"
                ]
            },
            {
                name: "Oppo F/K Series",
                models: [
                    "Oppo F27 Pro+", "Oppo F25 Pro", "Oppo F23", "Oppo F21 Pro", "Oppo F19 Pro+", "Oppo F19 Pro", "Oppo F19", "Oppo F17 Pro", "Oppo F17", "Oppo F15", "Oppo F11 Pro", "Oppo F11", "Oppo F9 Pro", "Oppo F9", "Oppo F7", "Oppo F5",
                    "Oppo K12", "Oppo K11", "Oppo K10", "Oppo K9 Pro", "Oppo K7x", "Oppo K5", "Oppo K3"
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
                    "Realme GT 7 Pro", "Realme GT 6", "Realme GT 6T", "Realme GT 5 Pro", "Realme GT 5", "Realme GT Neo 6", "Realme GT Neo 6 SE", "Realme GT Neo 5", "Realme GT Neo 5 SE", "Realme GT 2 Pro", "Realme GT 2", "Realme GT Neo 3", "Realme GT Neo 3T", "Realme GT Neo 2", "Realme GT Master Edition", "Realme GT Explorer Master", "Realme GT"
                ]
            },
            {
                name: "Realme Number Series",
                models: [
                    "Realme 13 Pro+", "Realme 13 Pro", "Realme 13", "Realme 12 Pro+", "Realme 12 Pro", "Realme 12", "Realme 12x", "Realme 11 Pro+", "Realme 11 Pro", "Realme 11", "Realme 11x", "Realme 10 Pro+", "Realme 10 Pro", "Realme 10", "Realme 9 Pro+", "Realme 9 Pro", "Realme 9", "Realme 9i", "Realme 8 Pro", "Realme 8", "Realme 8s", "Realme 8i", "Realme 7 Pro", "Realme 7", "Realme 7i", "Realme 6 Pro", "Realme 6", "Realme 6i", "Realme 5 Pro", "Realme 5", "Realme 3 Pro", "Realme 2 Pro"
                ]
            },
            {
                name: "Narzo Series",
                models: [
                    "Narzo 70 Pro", "Narzo 70 Turbo", "Narzo 70x", "Narzo 60 Pro", "Narzo 60", "Narzo 50 Pro", "Narzo 50", "Narzo 50A", "Narzo 50i", "Narzo 30 Pro", "Narzo 30", "Narzo 20 Pro", "Narzo 20", "Narzo 10"
                ]
            },
            {
                name: "Realme C/P Series",
                models: [
                    "Realme C67", "Realme C65", "Realme C63", "Realme C55", "Realme C53", "Realme C51", "Realme C35", "Realme C33", "Realme C31", "Realme C30", "Realme C25", "Realme C21", "Realme C11", "Realme C3", "Realme C2",
                    "Realme P1 Pro", "Realme P1"
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
                    "Vivo X200 Ultra", "Vivo X200 Pro", "Vivo X200", "Vivo X100 Ultra", "Vivo X100 Pro", "Vivo X100", "Vivo X100s", "Vivo X90 Pro+", "Vivo X90 Pro", "Vivo X90", "Vivo X80 Pro", "Vivo X80", "Vivo X70 Pro+", "Vivo X70 Pro", "Vivo X60 Pro+", "Vivo X60 Pro", "Vivo X50 Pro", "Vivo X21", "Vivo Xplay6"
                ]
            },
            {
                name: "V Series",
                models: [
                    "Vivo V40 Pro", "Vivo V40", "Vivo V40 Lite", "Vivo V30 Pro", "Vivo V30", "Vivo V30e", "Vivo V29 Pro", "Vivo V29", "Vivo V29e", "Vivo V27 Pro", "Vivo V27", "Vivo V27e", "Vivo V25 Pro", "Vivo V25", "Vivo V23 Pro", "Vivo V23", "Vivo V21", "Vivo V20 Pro", "Vivo V20", "Vivo V19", "Vivo V17 Pro", "Vivo V15 Pro", "Vivo V11 Pro", "Vivo V9"
                ]
            },
            {
                name: "Y/T Series",
                models: [
                    "Vivo Y300 Pro", "Vivo Y200 Pro", "Vivo Y200", "Vivo Y100", "Vivo Y78+", "Vivo Y56", "Vivo Y35", "Vivo Y22", "Vivo Y16", "Vivo Y02", "Vivo Y21", "Vivo Y20", "Vivo Y19", "Vivo Y17", "Vivo Y15", "Vivo Y12", "Vivo Y91",
                    "Vivo T3 Pro", "Vivo T3", "Vivo T3x", "Vivo T2 Pro", "Vivo T2x", "Vivo T1 Pro", "Vivo T1"
                ]
            },
            {
                name: "iQOO Series",
                models: [
                    "iQOO 13", "iQOO 12 Pro", "iQOO 12", "iQOO 11 Pro", "iQOO 11", "iQOO 11S", "iQOO 10 Pro", "iQOO 10", "iQOO 9 Pro", "iQOO 9", "iQOO 9 SE", "iQOO 8 Pro", "iQOO 8", "iQOO 7", "iQOO Neo 9 Pro", "iQOO Neo 9", "iQOO Neo 8 Pro", "iQOO Neo 8", "iQOO Neo 7 Pro", "iQOO Neo 7", "iQOO Neo 6", "iQOO Z9 Turbo", "iQOO Z9", "iQOO Z8", "iQOO Z7 Pro", "iQOO Z7", "iQOO Z6 Pro", "iQOO Z6"
                ]
            }
        ]
    },
    {
        brand: "Motorola",
        series: [
            {
                name: "Edge Series",
                models: [
                    "Motorola Edge 50 Ultra", "Motorola Edge 50 Pro", "Motorola Edge 50 Fusion", "Motorola Edge 40 Pro", "Motorola Edge 40", "Motorola Edge 40 Neo", "Motorola Edge 30 Ultra", "Motorola Edge 30 Pro", "Motorola Edge 30 Fusion", "Motorola Edge 30 Neo", "Motorola Edge 20 Pro", "Motorola Edge 20", "Motorola Edge (2023)", "Motorola Edge (2022)"
                ]
            },
            {
                name: "Razr Series",
                models: [
                    "Motorola Razr 50 Ultra", "Motorola Razr 50", "Motorola Razr 40 Ultra", "Motorola Razr 40", "Motorola Razr 2022", "Motorola Razr 5G", "Motorola Razr (2019)"
                ]
            },
            {
                name: "Moto G Series",
                models: [
                    "Moto G85", "Moto G84", "Moto G75", "Moto G73", "Moto G64", "Moto G54", "Moto G34", "Moto G24", "Moto G14", "Moto G200", "Moto G100", "Moto G82", "Moto G72", "Moto G62", "Moto G52", "Moto G42", "Moto G32", "Moto G22", "Moto G Power (2024)", "Moto G Stylus (2024)"
                ]
            },
            {
                name: "Moto E/ThinkPhone",
                models: ["Moto E14", "Moto E13", "Moto E40", "Moto E32", "Moto E22", "Motorola ThinkPhone 25", "Motorola ThinkPhone"]
            }
        ]
    },
    {
        brand: "Asus",
        series: [
            {
                name: "ROG Phone Series",
                models: [
                    "ROG Phone 9 Pro", "ROG Phone 9", "ROG Phone 8 Pro", "ROG Phone 8", "ROG Phone 7 Ultimate", "ROG Phone 7", "ROG Phone 6D Ultimate", "ROG Phone 6 Pro", "ROG Phone 6", "ROG Phone 5s Pro", "ROG Phone 5s", "ROG Phone 5 Ultimate", "ROG Phone 5", "ROG Phone 3", "ROG Phone II", "ROG Phone"
                ]
            },
            {
                name: "Zenfone Series",
                models: [
                    "Zenfone 11 Ultra", "Zenfone 10", "Zenfone 9", "Zenfone 8 Flip", "Zenfone 8", "Zenfone 7 Pro", "Zenfone 7", "Zenfone 6", "Zenfone 5z", "Zenfone 4 Pro"
                ]
            }
        ]
    },
    {
        brand: "Sony",
        series: [
            {
                name: "Xperia 1 Series",
                models: [
                    "Xperia 1 VI", "Xperia 1 V", "Xperia 1 IV", "Xperia 1 III", "Xperia 1 II", "Xperia 1"
                ]
            },
            {
                name: "Xperia 5 Series",
                models: [
                    "Xperia 5 V", "Xperia 5 IV", "Xperia 5 III", "Xperia 5 II", "Xperia 5"
                ]
            },
            {
                name: "Xperia 10 Series",
                models: [
                    "Xperia 10 VI", "Xperia 10 V", "Xperia 10 IV", "Xperia 10 III", "Xperia 10 II", "Xperia 10"
                ]
            },
            {
                name: "Xperia Pro/Legacy",
                models: ["Xperia Pro-I", "Xperia Pro", "Xperia XZ3", "Xperia XZ2 Premium", "Xperia XZ1", "Xperia Z5 Premium", "Xperia Z3+"]
            }
        ]
    },
    {
        brand: "Google",
        series: [
            {
                name: "Pixel Pro/Ultra Series",
                models: [
                    "Pixel 9 Pro XL", "Pixel 9 Pro", "Pixel 9 Pro Fold", "Pixel 8 Pro", "Pixel 7 Pro", "Pixel 6 Pro"
                ]
            },
            {
                name: "Pixel Standard Series",
                models: [
                    "Pixel 9", "Pixel 8", "Pixel 7", "Pixel 6", "Pixel 5", "Pixel 4 XL", "Pixel 4", "Pixel 3 XL", "Pixel 3", "Pixel 2 XL", "Pixel 2", "Pixel XL", "Pixel"
                ]
            },
            {
                name: "Pixel A/Fold Series",
                models: ["Pixel 8a", "Pixel 7a", "Pixel 6a", "Pixel 5a 5G", "Pixel 4a 5G", "Pixel 4a", "Pixel 3a XL", "Pixel 3a", "Pixel Fold"]
            }
        ]
    },
    {
        brand: "OnePlus",
        series: [
            {
                name: "Number/R Series",
                models: [
                    "OnePlus 13", "OnePlus 12", "OnePlus 12R", "OnePlus 11", "OnePlus 11R", "OnePlus 10 Pro", "OnePlus 10T", "OnePlus 10R",
                    "OnePlus 9 Pro", "OnePlus 9RT", "OnePlus 9", "OnePlus 8 Pro", "OnePlus 8T", "OnePlus 8",
                    "OnePlus 7T Pro", "OnePlus 7 Pro", "OnePlus 7T", "OnePlus 7", "OnePlus 6T McLaren", "OnePlus 6T", "OnePlus 6", "OnePlus 5T", "OnePlus 5", "OnePlus 3T", "OnePlus 3", "OnePlus 2", "OnePlus One"
                ]
            },
            {
                name: "Nord Series",
                models: [
                    "OnePlus Nord 4", "OnePlus Nord 3", "OnePlus Nord CE 4", "OnePlus Nord CE 4 Lite", "OnePlus Nord CE 3", "OnePlus Nord CE 3 Lite",
                    "OnePlus Nord 2T", "OnePlus Nord 2", "OnePlus Nord CE 2", "OnePlus Nord CE 2 Lite", "OnePlus Nord", "OnePlus Nord CE",
                    "OnePlus Nord N30", "OnePlus Nord N300", "OnePlus Nord N20", "OnePlus Nord N200", "OnePlus Nord N10", "OnePlus Nord N100"
                ]
            },
            {
                name: "OnePlus Open/Pad",
                models: ["OnePlus Open", "OnePlus Pad 2", "OnePlus Pad Go", "OnePlus Pad"]
            }
        ]
    },
    {
        brand: "Huawei",
        series: [
            {
                name: "P/Pura Series",
                models: [
                    "Pura 70 Ultra", "Pura 70 Pro+", "Pura 70 Pro", "Pura 70", "P60 Pro", "P60 Art", "P50 Pro", "P50 Pocket", "P40 Pro+", "P40 Pro", "P40", "P30 Pro", "P30", "P20 Pro", "P20", "P10 Plus"
                ]
            },
            {
                name: "Mate Series",
                models: [
                    "Mate 60 RS Ultimate", "Mate 60 Pro+", "Mate 60 Pro", "Mate 60", "Mate X5", "Mate 50 Pro", "Mate 50", "Mate Xs 2", "Mate 40 Pro+", "Mate 40 Pro", "Mate 30 Pro", "Mate 20 Pro", "Mate 10 Pro", "Mate RS Porsche Design"
                ]
            },
            {
                name: "Nova Series",
                models: [
                    "Nova 13 Pro", "Nova 13", "Nova 12 Ultra", "Nova 12 Pro", "Nova 12", "Nova 11 Ultra", "Nova 11 Pro", "Nova 11", "Nova 10 Pro", "Nova 10", "Nova 9 Pro", "Nova 9", "Nova 8 Pro", "Nova 7 Pro"
                ]
            }
        ]
    },
    {
        brand: "Honor",
        series: [
            {
                name: "Magic Series",
                models: [
                    "Magic 7 Pro", "Magic 7", "Magic 6 Pro", "Magic 6", "Magic 6 Ultimate", "Magic 6 Lite", "Magic 5 Pro", "Magic 5", "Magic 4 Pro", "Magic V3", "Magic V2", "Magic Vs2", "Magic V Flip"
                ]
            },
            {
                name: "Honor Number Series",
                models: [
                    "Honor 200 Pro", "Honor 200", "Honor 200 Lite", "Honor 100 Pro", "Honor 100", "Honor 90 Pro", "Honor 90", "Honor 80 Pro", "Honor 70 Pro", "Honor 60 Pro", "Honor 50 Pro"
                ]
            },
            {
                name: "Honor X Series",
                models: [
                    "Honor X9c", "Honor X9b", "Honor X8b", "Honor X7b", "Honor X50", "Honor X40", "Honor X30", "Honor X10"
                ]
            }
        ]
    },
    {
        brand: "Nothing",
        series: [
            {
                name: "Phone Series",
                models: [
                    "Nothing Phone (2a) Plus", "Nothing Phone (2a)", "Nothing Phone (2)", "Nothing Phone (1)", "CMF Phone 1"
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
                    "RedMagic 10 Pro+", "RedMagic 10 Pro", "RedMagic 9S Pro+", "RedMagic 9S Pro", "RedMagic 9 Pro+", "RedMagic 9 Pro", "RedMagic 8S Pro", "RedMagic 8 Pro", "RedMagic 7S Pro", "RedMagic 7 Pro", "RedMagic 6S Pro", "RedMagic 6 Pro", "RedMagic 5G", "RedMagic 3S"
                ]
            },
            {
                name: "Nubia Z Series",
                models: [
                    "Nubia Z70 Ultra", "Nubia Z60 Ultra Leading", "Nubia Z60 Ultra", "Nubia Z50 Ultra", "Nubia Z50S Pro", "Nubia Z40 Pro", "Nubia Z30 Pro"
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
                    "Zero 40 5G", "Zero 30 5G", "Zero Ultra", "Zero 20", "Zero X Pro"
                ]
            },
            {
                name: "Note Series",
                models: [
                    "Note 40 Pro+", "Note 40 Pro", "Note 40", "Note 30 VIP", "Note 30 Pro", "Note 30", "Note 12 Pro", "Note 12", "Note 11 Pro", "Note 10 Pro"
                ]
            },
            {
                name: "GT/Hot Series",
                models: [
                    "GT 20 Pro", "GT 10 Pro", "Hot 50 Pro+", "Hot 50", "Hot 40 Pro", "Hot 40", "Hot 30", "Hot 20", "Hot 12", "Hot 11"
                ]
            }
        ]
    },
    {
        brand: "Tecno",
        series: [
            {
                name: "Phantom Series",
                models: [
                    "Phantom V Fold 2", "Phantom V Flip 2", "Phantom V Fold", "Phantom V Flip", "Phantom X2 Pro", "Phantom X2", "Phantom X"
                ]
            },
            {
                name: "Camon Series",
                models: [
                    "Camon 30 Premier", "Camon 30 Pro", "Camon 30", "Camon 20 Premier", "Camon 20 Pro", "Camon 19 Pro", "Camon 18 Premier", "Camon 17 Pro"
                ]
            },
            {
                name: "Pova/Spark Series",
                models: [
                    "Pova 6 Pro", "Pova 6", "Pova 5 Pro", "Pova 5", "Pova 4 Pro", "Spark 30 Pro", "Spark 20 Pro+", "Spark 20 Pro", "Spark 10 Pro"
                ]
            }
        ]
    },
    {
        brand: "Meizu",
        series: [
            {
                name: "Meizu Number Series",
                models: [
                    "Meizu 21 Pro", "Meizu 21", "Meizu 21 Note", "Meizu 20 Pro", "Meizu 20 Infinity", "Meizu 20", "Meizu 18s Pro", "Meizu 18 Pro", "Meizu 17 Pro", "Meizu 16s Pro"
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
                    "Poco F6 Pro", "Poco F6", "Poco F5 Pro", "Poco F5", "Poco F4 GT", "Poco F4", 
                    "Poco F3 GT", "Poco F3", "Poco F2 Pro", "Poco F1"
                ]
            },
            {
                name: "Poco X Series",
                models: [
                    "Poco X6 Pro", "Poco X6", "Poco X6 Neo", "Poco X5 Pro", "Poco X5", 
                    "Poco X4 Pro 5G", "Poco X4 GT", "Poco X3 Pro", "Poco X3 NFC", "Poco X3", "Poco X2"
                ]
            },
            {
                name: "Poco M/C Series",
                models: [
                    "Poco M6 Pro", "Poco M6 5G", "Poco M5s", "Poco M5", "Poco M4 Pro 5G", "Poco M4 Pro", "Poco M4 5G", 
                    "Poco M3 Pro 5G", "Poco M3", "Poco M2 Pro", "Poco M2 Reloaded", "Poco M2",
                    "Poco C65", "Poco C61", "Poco C55", "Poco C51", "Poco C50", "Poco C40", "Poco C31", "Poco C3"
                ]
            }
        ]
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = devices;
}
