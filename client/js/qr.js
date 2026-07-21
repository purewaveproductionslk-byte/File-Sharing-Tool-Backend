(function() {
    var ECC_M = 1;

    var ALIGNMENT_POSITIONS = {
        1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
        7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
        11: [6, 30, 54], 12: [6, 32, 58], 13: [6, 34, 62], 14: [6, 26, 46, 66],
        15: [6, 26, 48, 70], 16: [6, 26, 50, 74], 17: [6, 30, 54, 78],
        18: [6, 30, 56, 82], 19: [6, 30, 58, 86], 20: [6, 34, 62, 90],
        21: [6, 28, 50, 72, 94], 22: [6, 26, 50, 74, 98], 23: [6, 30, 54, 78, 102],
        24: [6, 28, 54, 80, 106], 25: [6, 32, 58, 84, 110], 26: [6, 30, 58, 86, 114],
        27: [6, 34, 62, 90, 118], 28: [6, 26, 50, 74, 98, 122], 29: [6, 30, 54, 78, 102, 126],
        30: [6, 26, 52, 78, 104, 130], 31: [6, 30, 56, 82, 108, 134],
        32: [6, 34, 60, 86, 112, 138], 33: [6, 30, 58, 86, 114, 142],
        34: [6, 34, 62, 90, 118, 146], 35: [6, 30, 54, 78, 102, 126, 150],
        36: [6, 24, 50, 76, 102, 128, 154], 37: [6, 28, 54, 80, 106, 132, 158],
        38: [6, 32, 58, 84, 110, 136, 162], 39: [6, 26, 54, 82, 110, 138, 166],
        40: [6, 30, 58, 86, 114, 142, 170]
    };

    var TOTAL_CODEWORDS = {
        1: 26, 2: 44, 3: 70, 4: 100, 5: 134, 6: 172, 7: 196, 8: 242, 9: 292, 10: 346,
        11: 404, 12: 466, 13: 532, 14: 581, 15: 655, 16: 733, 17: 815, 18: 901, 19: 991, 20: 1085,
        21: 1156, 22: 1258, 23: 1364, 24: 1474, 25: 1588, 26: 1706, 27: 1828, 28: 1921, 29: 2051, 30: 2185,
        31: 2323, 32: 2465, 33: 2611, 34: 2761, 35: 2876, 36: 3034, 37: 3196, 38: 3362, 39: 3532, 40: 3706
    };

    var EC_CODEWORDS_PER_BLOCK_M = {
        1: 10, 2: 16, 3: 26, 4: 18, 5: 24, 6: 16, 7: 18, 8: 22, 9: 22, 10: 26,
        11: 30, 12: 22, 13: 22, 14: 24, 15: 24, 16: 28, 17: 28, 18: 26, 19: 26, 20: 26,
        21: 26, 22: 28, 23: 28, 24: 28, 25: 28, 26: 28, 27: 28, 28: 30, 29: 30, 30: 30,
        31: 30, 32: 30, 33: 30, 34: 30, 35: 30, 36: 30, 37: 30, 38: 30, 39: 30, 40: 30
    };

    var NUMBER_OF_ERROR_CORRECTION_BLOCKS_M = {
        1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 4, 7: 4, 8: 2, 9: 3, 10: 4,
        11: 1, 12: 6, 13: 8, 14: 4, 15: 5, 16: 6, 17: 8, 18: 8, 19: 5, 20: 5,
        21: 5, 22: 8, 23: 9, 24: 9, 25: 5, 26: 9, 27: 9, 28: 3, 29: 3, 30: 3,
        31: 3, 32: 3, 33: 3, 34: 3, 35: 3, 36: 3, 37: 3, 38: 3, 39: 3, 40: 3
    };

    var CAPACITIES = {
        1: [17, 14, 11, 7], 2: [32, 26, 20, 14], 3: [53, 42, 32, 24], 4: [78, 62, 46, 34],
        5: [106, 84, 60, 44], 6: [134, 106, 74, 58], 7: [154, 122, 86, 64], 8: [192, 152, 108, 84],
        9: [230, 180, 130, 98], 10: [271, 213, 151, 119], 11: [321, 251, 177, 137],
        12: [367, 287, 203, 155], 13: [425, 331, 241, 177], 14: [458, 362, 258, 194],
        15: [520, 412, 292, 220], 16: [586, 450, 322, 250], 17: [644, 504, 364, 280],
        18: [718, 560, 394, 310], 19: [792, 624, 442, 338], 20: [858, 666, 482, 368],
        21: [929, 714, 509, 408], 22: [1003, 782, 565, 448], 23: [1091, 860, 611, 494],
        24: [1171, 914, 661, 524], 25: [1273, 998, 715, 564], 26: [1367, 1070, 751, 594],
        27: [1465, 1155, 805, 642], 28: [1528, 1210, 868, 690], 29: [1628, 1290, 908, 720],
        30: [1732, 1370, 982, 772], 31: [1840, 1460, 1030, 812], 32: [1952, 1548, 1112, 852],
        33: [2068, 1638, 1168, 898], 34: [2188, 1732, 1228, 950], 35: [2303, 1828, 1283, 984],
        36: [2431, 1926, 1351, 1036], 37: [2563, 2030, 1423, 1088], 38: [2699, 2138, 1499, 1144],
        39: [2809, 2254, 1579, 1212], 40: [2953, 2370, 1663, 1272]
    };

    var GF256 = {
        exp: new Uint8Array(256),
        log: new Uint8Array(256),
        init: function() {
            var x = 1;
            for (var i = 0; i < 255; i++) {
                this.exp[i] = x;
                this.log[x] = i;
                x <<= 1;
                if (x >= 256) x ^= 0x11d;
            }
            this.exp[255] = this.exp[0];
        },
        mul: function(a, b) {
            if (a === 0 || b === 0) return 0;
            return this.exp[(this.log[a] + this.log[b]) % 255];
        }
    };
    GF256.init();

    function rsEncode(data, ecLen) {
        var gen = [1];
        for (var i = 0; i < ecLen; i++) {
            var newGen = new Array(gen.length + 1).fill(0);
            for (var j = 0; j < gen.length; j++) {
                newGen[j] ^= gen[j];
                newGen[j + 1] ^= GF256.mul(gen[j], GF256.exp[i]);
            }
            gen = newGen;
        }

        var remainder = new Uint8Array(ecLen);
        for (var i = 0; i < data.length; i++) {
            var coeff = data[i] ^ remainder[0];
            for (var j = 0; j < ecLen - 1; j++) {
                remainder[j] = remainder[j + 1] ^ GF256.mul(gen[j + 1], coeff);
            }
            remainder[ecLen - 1] = GF256.mul(gen[ecLen], coeff);
        }
        return remainder;
    }

    function getVersion(text) {
        var len = getByteLength(text);
        for (var v = 1; v <= 40; v++) {
            if (len <= CAPACITIES[v][0]) return v;
        }
        return -1;
    }

    function getByteLength(text) {
        var total = 0;
        for (var i = 0; i < text.length; i++) {
            var c = text.charCodeAt(i);
            if (c < 0x80) total += 1;
            else if (c < 0x800) total += 2;
            else total += 3;
        }
        return total;
    }

    function isAlphanumeric(text) {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
        for (var i = 0; i < text.length; i++) {
            if (chars.indexOf(text[i]) === -1) return false;
        }
        return true;
    }

    function encodeData(text, version) {
        var isAlpha = isAlphanumeric(text);
        var dataCapacityBits = CAPACITIES[version][0] * 8;

        var dataBits = [];
        var mode = isAlpha ? 2 : 4;
        var lenBits = version >= 10 ? 16 : (isAlpha ? (version >= 10 ? 11 : 9) : 8);

        if (isAlpha && version >= 10) lenBits = 11;
        else if (isAlpha) lenBits = 9;

        dataBits.push((mode >> 3) & 1, (mode >> 2) & 1, (mode >> 1) & 1, mode & 1);

        for (var i = lenBits - 1; i >= 0; i--) {
            dataBits.push((text.length >> i) & 1);
        }

        if (isAlpha) {
            var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
            var pairs = Math.floor(text.length / 2);
            var remainder = text.length % 2;

            for (var i = 0; i < pairs; i++) {
                var val = chars.indexOf(text[i * 2]) * 45 + chars.indexOf(text[i * 2 + 1]);
                dataBits.push((val >> 9) & 1, (val >> 8) & 1, (val >> 7) & 1, (val >> 6) & 1,
                    (val >> 5) & 1, (val >> 4) & 1, (val >> 3) & 1, (val >> 2) & 1, (val >> 1) & 1, val & 1);
            }
            if (remainder) {
                var val = chars.indexOf(text[pairs * 2]);
                dataBits.push((val >> 5) & 1, (val >> 4) & 1, (val >> 3) & 1, (val >> 2) & 1, (val >> 1) & 1, val & 1);
            }
        } else {
            var bytes = new TextEncoder().encode(text);
            for (var i = 0; i < bytes.length; i++) {
                var b = bytes[i];
                for (var j = 7; j >= 0; j--) {
                    dataBits.push((b >> j) & 1);
                }
            }
        }

        var terminatorLength = Math.min(4, dataCapacityBits - dataBits.length);
        for (var i = 0; i < terminatorLength; i++) {
            dataBits.push(0);
        }

        while (dataBits.length % 8 !== 0) {
            dataBits.push(0);
        }

        var padBytes = [0xEC, 0x11];
        var padIdx = 0;
        while (dataBits.length < dataCapacityBits) {
            var pb = padBytes[padIdx % 2];
            for (var j = 7; j >= 0; j--) {
                dataBits.push((pb >> j) & 1);
            }
            padIdx++;
        }

        var dataBytes = new Uint8Array(dataBits.length / 8);
        for (var i = 0; i < dataBytes.length; i++) {
            var byte = 0;
            for (var j = 0; j < 8; j++) {
                byte = (byte << 1) | dataBits[i * 8 + j];
            }
            dataBytes[i] = byte;
        }

        return dataBytes;
    }

    function generateECData(dataBytes, version) {
        var blocksCount = NUMBER_OF_ERROR_CORRECTION_BLOCKS_M[version];
        var ecPerBlock = EC_CODEWORDS_PER_BLOCK_M[version];
        var totalDataCW = dataBytes.length;
        var blockSize = Math.floor(totalDataCW / blocksCount);
        var extraBlocks = totalDataCW % blocksCount;

        var blocks = [];
        var offset = 0;
        for (var i = 0; i < blocksCount; i++) {
            var size = blockSize + (i < extraBlocks ? 1 : 0);
            var block = dataBytes.slice(offset, offset + size);
            offset += size;
            var ec = rsEncode(block, ecPerBlock);
            blocks.push({ data: block, ec: ec });
        }

        var result = [];
        var maxDataSize = blockSize + (extraBlocks > 0 ? 1 : 0);

        for (var i = 0; i < maxDataSize; i++) {
            for (var j = 0; j < blocksCount; j++) {
                if (i < blocks[j].data.length) {
                    result.push(blocks[j].data[i]);
                }
            }
        }

        for (var i = 0; i < ecPerBlock; i++) {
            for (var j = 0; j < blocksCount; j++) {
                result.push(blocks[j].ec[i]);
            }
        }

        return new Uint8Array(result);
    }

    function createMatrix(version) {
        var size = version * 4 + 17;
        var matrix = [];
        var reserved = [];
        for (var r = 0; r < size; r++) {
            matrix[r] = new Int8Array(size).fill(-1);
            reserved[r] = new Uint8Array(size);
        }
        return { matrix: matrix, reserved: reserved, size: size };
    }

    function placeFinderPattern(m, row, col) {
        var pattern = [
            [1,1,1,1,1,1,1],
            [1,0,0,0,0,0,1],
            [1,0,1,1,1,0,1],
            [1,0,1,1,1,0,1],
            [1,0,1,1,1,0,1],
            [1,0,0,0,0,0,1],
            [1,1,1,1,1,1,1]
        ];
        for (var r = 0; r < 7; r++) {
            for (var c = 0; c < 7; c++) {
                var mr = row + r;
                var mc = col + c;
                if (mr >= 0 && mr < m.size && mc >= 0 && mc < m.size) {
                    m.matrix[mr][mc] = pattern[r][c] === 1 ? 1 : 0;
                    m.reserved[mr][mc] = 1;
                }
            }
        }
    }

    function placeSeparator(m, row, col, hSize, vSize) {
        for (var i = 0; i < hSize; i++) {
            var r = row;
            var c = col + i;
            if (r >= 0 && r < m.size && c >= 0 && c < m.size) {
                m.matrix[r][c] = 0;
                m.reserved[r][c] = 1;
            }
        }
        for (var i = 0; i < hSize; i++) {
            var r = row + vSize - 1;
            var c = col + i;
            if (r >= 0 && r < m.size && c >= 0 && c < m.size) {
                m.matrix[r][c] = 0;
                m.reserved[r][c] = 1;
            }
        }
        for (var i = 0; i < vSize; i++) {
            var r = row + i;
            var c = col;
            if (r >= 0 && r < m.size && c >= 0 && c < m.size) {
                m.matrix[r][c] = 0;
                m.reserved[r][c] = 1;
            }
        }
        for (var i = 0; i < vSize; i++) {
            var r = row + i;
            var c = col + hSize - 1;
            if (r >= 0 && r < m.size && c >= 0 && c < m.size) {
                m.matrix[r][c] = 0;
                m.reserved[r][c] = 1;
            }
        }
    }

    function placeTimings(m) {
        for (var i = 8; i < m.size - 8; i++) {
            var val = i % 2 === 0 ? 1 : 0;
            if (!m.reserved[6][i]) {
                m.matrix[6][i] = val;
                m.reserved[6][i] = 1;
            }
            if (!m.reserved[i][6]) {
                m.matrix[i][6] = val;
                m.reserved[i][6] = 1;
            }
        }
    }

    function placeAlignmentPattern(m, version) {
        var positions = ALIGNMENT_POSITIONS[version];
        if (!positions || positions.length === 0) return;

        for (var i = 0; i < positions.length; i++) {
            for (var j = 0; j < positions.length; j++) {
                var row = positions[i];
                var col = positions[j];

                if (m.reserved[row][col]) continue;

                for (var dr = -2; dr <= 2; dr++) {
                    for (var dc = -2; dc <= 2; dc++) {
                        var r = row + dr;
                        var c = col + dc;
                        if (r >= 0 && r < m.size && c >= 0 && c < m.size) {
                            if (Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0)) {
                                m.matrix[r][c] = 1;
                            } else {
                                m.matrix[r][c] = 0;
                            }
                            m.reserved[r][c] = 1;
                        }
                    }
                }
            }
        }
    }

    function placeDarkModule(m, version) {
        var row = 4 * version + 9;
        m.matrix[row][8] = 1;
        m.reserved[row][8] = 1;
    }

    function placeFormatInfo(m, mask) {
        var formatInfo = (ECC_M << 3) | mask;
        var rem = formatInfo;
        for (var i = 0; i < 10; i++) {
            rem = (rem << 1) ^ ((rem >> 9) * 0x537);
        }
        var bits = ((formatInfo << 10) | rem) ^ 0x5412;

        var positions1 = [
            [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
            [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
        ];

        var positions2 = [
            [m.size - 1, 8], [m.size - 2, 8], [m.size - 3, 8], [m.size - 4, 8],
            [m.size - 5, 8], [m.size - 6, 8], [m.size - 7, 8],
            [8, m.size - 8], [8, m.size - 7], [8, m.size - 6], [8, m.size - 5],
            [8, m.size - 4], [8, m.size - 3], [8, m.size - 2], [8, m.size - 1]
        ];

        for (var i = 0; i < 15; i++) {
            var bit = (bits >> (14 - i)) & 1;
            m.matrix[positions1[i][0]][positions1[i][1]] = bit;
            m.reserved[positions1[i][0]][positions1[i][1]] = 1;
            m.matrix[positions2[i][0]][positions2[i][1]] = bit;
            m.reserved[positions2[i][0]][positions2[i][1]] = 1;
        }
    }

    function placeDataBits(m, data) {
        var bitIdx = 0;
        var totalBits = data.length * 8;
        var col = m.size - 1;
        var upward = true;

        while (col >= 0) {
            if (col === 6) col--;

            var rows = upward ?
                Array.from({length: m.size}, function(_, i) { return m.size - 1 - i; }) :
                Array.from({length: m.size}, function(_, i) { return i; });

            for (var i = 0; i < m.size; i++) {
                var r = rows[i];
                for (var dc = 0; dc < 2; dc++) {
                    var c = col - dc;
                    if (c < 0) continue;
                    if (m.reserved[r][c]) continue;

                    if (bitIdx < totalBits) {
                        var byteIdx = Math.floor(bitIdx / 8);
                        var bitShift = 7 - (bitIdx % 8);
                        m.matrix[r][c] = (data[byteIdx] >> bitShift) & 1;
                        bitIdx++;
                    } else {
                        m.matrix[r][c] = 0;
                    }
                }
            }

            upward = !upward;
            col -= 2;
        }
    }

    var MASK_FUNCTIONS = [
        function(r, c) { return (r + c) % 2 === 0; },
        function(r, c) { return r % 2 === 0; },
        function(r, c) { return c % 3 === 0; },
        function(r, c) { return (r + c) % 3 === 0; },
        function(r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
        function(r, c) { return ((r * c) % 2) + ((r * c) % 3) === 0; },
        function(r, c) { return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0; },
        function(r, c) { return ((r + c) % 2 + (r * c) % 3) % 2 === 0; }
    ];

    function applyMask(m, maskIdx) {
        var fn = MASK_FUNCTIONS[maskIdx];
        var result = m.matrix.map(function(row) { return new Int8Array(row); });
        for (var r = 0; r < m.size; r++) {
            for (var c = 0; c < m.size; c++) {
                if (!m.reserved[r][c] && fn(r, c)) {
                    result[r][c] ^= 1;
                }
            }
        }
        return result;
    }

    function calculatePenalty(matrix, size) {
        var penalty = 0;

        for (var r = 0; r < size; r++) {
            var count = 1;
            for (var c = 1; c < size; c++) {
                if (matrix[r][c] === matrix[r][c - 1]) {
                    count++;
                    if (count === 5) penalty += 3;
                    else if (count > 5) penalty += 1;
                } else {
                    count = 1;
                }
            }
        }

        for (var c = 0; c < size; c++) {
            var count = 1;
            for (var r = 1; r < size; r++) {
                if (matrix[r][c] === matrix[r - 1][c]) {
                    count++;
                    if (count === 5) penalty += 3;
                    else if (count > 5) penalty += 1;
                } else {
                    count = 1;
                }
            }
        }

        for (var r = 0; r < size - 1; r++) {
            for (var c = 0; c < size - 1; c++) {
                var val = matrix[r][c];
                if (val === matrix[r][c + 1] && val === matrix[r + 1][c] && val === matrix[r + 1][c + 1]) {
                    penalty += 3;
                }
            }
        }

        var darkCount = 0;
        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                if (matrix[r][c] === 1) darkCount++;
            }
        }
        var total = size * size;
        var percentage = darkCount / total * 100;
        var prevFive = Math.floor(percentage / 5) * 5;
        var nextFive = prevFive + 5;
        penalty += Math.min(Math.abs(prevFive - 50) / 5, Math.abs(nextFive - 50) / 5) * 10;

        return penalty;
    }

    function selectBestMask(m, data) {
        var bestMask = 0;
        var bestPenalty = Infinity;

        for (var mask = 0; mask < 8; mask++) {
            placeFormatInfo(m, mask);
            var masked = applyMask(m, mask);
            var penalty = calculatePenalty(masked, m.size);
            if (penalty < bestPenalty) {
                bestPenalty = penalty;
                bestMask = mask;
            }
        }

        return bestMask;
    }

    function generate(text) {
        var version = getVersion(text);
        if (version === -1) {
            throw new Error('Text too long for QR code');
        }

        var size = version * 4 + 17;
        var m = createMatrix(version);

        placeFinderPattern(m, 0, 0);
        placeFinderPattern(m, 0, size - 7);
        placeFinderPattern(m, size - 7, 0);

        var sepSize = 8;
        placeSeparator(m, 0, 7, sepSize, 7);
        placeSeparator(m, 0, size - 8, sepSize, 7);
        placeSeparator(m, size - 7, 0, 7, sepSize);

        placeTimings(m);
        placeAlignmentPattern(m, version);
        placeDarkModule(m, version);

        var dataBytes = encodeData(text, version);
        var allData = generateECData(dataBytes, version);

        var mask = selectBestMask(m, allData);
        placeFormatInfo(m, mask);
        placeDataBits(m, allData);

        var finalMatrix = applyMask(m, mask);

        return renderMatrix(finalMatrix, size);
    }

    function renderMatrix(matrix, size) {
        var cellSize = 4;
        var margin = cellSize * 4;
        var canvasSize = size * cellSize + margin * 2;

        var canvas = document.createElement('canvas');
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        var ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        ctx.fillStyle = '#000000';
        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                if (matrix[r][c] === 1) {
                    ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize, cellSize);
                }
            }
        }

        return canvas;
    }

    function renderTo(container, text, size) {
        var canvas = generate(text);
        if (size) {
            canvas.style.width = size + 'px';
            canvas.style.height = size + 'px';
        }
        container.innerHTML = '';
        container.appendChild(canvas);
        return canvas;
    }

    window.QR = {
        generate: generate,
        renderTo: renderTo
    };
})();