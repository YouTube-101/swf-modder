function bin(int) {
    return int.toString(2).padStart(8, '0');
}
function hex(int) {
    return int.toString(16).padStart(2, '0').toUpperCase();
}
const startEditor = (name, swfData) => {
    document.body.innerHTML = '<p>Loading...</p>';
    document.title = name + " - SWF Modder";
    let swf = {
        header: {},
        tags: []
    };
    let dv = new DataView(swfData);
    let offset = 0;
    function readHex(len = 2) {
        let result = [];
        for (let i = 0; i < len; i++) {
            result.push(hex(dv.getUint8(offset + i)));
        }
        console.log(result.join(' '));
    }
    function read8(lock = false) { return dv.getUint8(lock ? offset : offset++); }
    function read16(le = true, lock = false) {
        if (!lock) offset += 2;
        return dv.getUint16(lock ? offset : offset - 2, le);
    }
    function read32(le = true, lock = false) {
        if (!lock) offset += 4;
        return dv.getUint32(lock ? offset : offset - 4, le);
    }
    function readU30(lock = false) {
        let result = 0;
        let shift = 0;
        let index = offset;
        while (index < swfData.length) {
            const byte = swfData[index];
            result |= (byte & 0x7F) << shift;
            index++;
            if (byte < 0x80) {
                break;
            }
            shift += 7;
        }
        if (!lock) {
            offset = index;
        }
        return result;
    }
    function readS24(lock = false) {
        if (offset + 3 > swfData.length) throw new RangeError("readS24: out of bounds");
        const b0 = swfData[offset];
        const b1 = swfData[offset + 1];
        const b2 = swfData[offset + 2];
        let value = (b0) | (b1 << 8) | (b2 << 16);
        if (value & 0x800000) value |= 0xFF000000;
        if (!lock) {
            offset += 3;
        }
        return value;
    }
    function readS32(lock = false) {
        let result = 0;
        let shift = 0;
        let index = offset;
        let byte;
        do {
            byte = swfData[index++];
            result |= (byte & 0x7F) << shift;
            shift += 7;
        } while ((byte & 0x80) && index < swfData.length);
        if (shift < 32 && (byte & 0x40)) {
            result |= (~0 << shift);
        }
        if (!lock) {
            offset = index;
        }
        return result;
    }
    function readU32(lock = false) {
        let result = 0;
        let shift = 0;
        let index = offset;
        while (index < swfData.length) {
            const byte = swfData[index];
            result |= (byte & 0x7F) << shift;
            index++;
            if (byte < 0x80) {
                break;
            }
            shift += 7;
        }
        if (!lock) {
            offset = index;
        }
        return result;
    }
    swf.header.signature = String.fromCharCode(read8(), read8(), read8());
    swf.header.version = read8();
    swf.header.fileLength = read32();
    if (swf.header.signature === 'CWS') {
        // Handle compressed SWF
        const header = new Uint8Array(swfData, 0, 8);
        const compressedData = new Uint8Array(swfData, 8);
        const decompressedData = pako.inflate(compressedData);
        const newData = new Uint8Array(header.length + decompressedData.length);
        newData.set(header, 0);
        newData.set(decompressedData, header.length);
        swfData = newData.buffer;
        dv = new DataView(newData.buffer);
        offset = 0;
        console.log("Decompressed SWF data");
        swf.header.signature = String.fromCharCode(read8(), read8(), read8());
        swf.header.version = read8();
        swf.header.fileLength = read32();
    }
    const displayRect = {
        NBits: read8(true) >> 3
    }
    const bytesneeded = Math.ceil((5 + (displayRect.NBits * 4)) / 8);
    let displayrect = '';
    for (let i = 0; i < bytesneeded; i++) displayrect += bin(read8());
    displayrect = displayrect.substring(5);
    displayRect.Xmin = parseInt(displayrect.substring(0, displayRect.NBits), 2);
    displayRect.Xmax = parseInt(displayrect.substring(displayRect.NBits, displayRect.NBits * 2), 2);
    displayRect.Ymin = parseInt(displayrect.substring(displayRect.NBits * 2, displayRect.NBits * 3), 2);
    displayRect.Ymax = parseInt(displayrect.substring(displayRect.NBits * 3, displayRect.NBits * 4), 2);
    swf.header.displayRect = displayRect;
    swf.header.frameRate = read16() / 256;
    swf.header.frameCount = read16();
    while (offset < swf.header.fileLength) {
        const taglib = {
            0: "End",
            1: "ShowFrame",
            2: "DefineShape",
            4: "PlaceObject",
            5: "RemoveObject",
            6: "DefineBits",
            7: "DefineButton",
            8: "JPEGTables",
            9: "SetBackgroundColor",
            10: "DefineFont",
            11: "DefineText",
            12: "DoAction",
            13: "DefineFontInfo",
            14: "DefineSound",
            15: "StartSound",
            17: "DefineButtonSound",
            18: "SoundStreamHead",
            19: "SoundStreamBlock",
            20: "DefineBitsLossless",
            21: "DefineBitsJPEG2",
            22: "DefineShape2",
            23: "DefineButtonCxform",
            24: "Protect",
            26: "PlaceObject2",
            28: "RemoveObject2",
            32: "DefineShape3",
            33: "DefineText2",
            34: "DefineButton2",
            35: "DefineBitsJPEG3",
            36: "DefineBitsLossless2",
            37: "DefineEditText",
            39: "DefineSprite",
            41: "ProductInfo",
            43: "FrameLabel",
            45: "SoundStreamHead2",
            46: "DefineMorphShape",
            48: "DefineFont2",
            56: "ExportAssets",
            57: "ImportAssets",
            58: "EnableDebugger",
            59: "DoInitAction",
            60: "DefineVideoStream",
            61: "VideoFrame",
            62: "DefineFontInfo2",
            63: "DebugID",
            64: "EnableDebugger2",
            65: "ScriptLimits",
            66: "SetTabIndex",
            69: "FileAttributes",
            70: "PlaceObject3",
            71: "ImportAssets2",
            73: "DefineFontAlignZones",
            74: "CSMTextSettings",
            75: "DefineFont3",
            76: "SymbolClass",
            77: "Metadata",
            78: "DefineScalingGrid",
            82: "DoABC",
            83: "DefineShape4",
            84: "DefineMorphShape2",
            86: "DefineSceneAndFrameLabelData",
            87: "DefineBinaryData",
            88: "DefineFontName",
            89: "StartSound2",
            90: "DefineBitsJPEG4",
            91: "DefineFont4",
            93: "EnableTelemetry",
        }
        let tagbin = bin(read8());
        tagbin = bin(read8()) + tagbin;
        let tag = {
            type: parseInt(tagbin.substring(0, 10), 2),
            length: parseInt(tagbin.substring(10), 2),
        }
        if (taglib[tag.type] !== undefined) {
            tag.type = taglib[tag.type];
        }
        if (tag.length === 0x3F) {
            tag.length = read32();
        }
        tag.data = [];
        for (let i = 0; i < tag.length; i++) {
            tag.data.push(read8());
        }
        if (tag.type === "FrameLabel") {
            const decoder = new TextDecoder("utf-8");
            tag.name = decoder.decode(new Uint8Array(tag.data.slice(0, -1)));
        }
        else if (tag.type === "DoABC") {
            tag.flags = tag.data[0] | (tag.data[1] << 8) | (tag.data[2] << 16) | (tag.data[3] << 24);
            const decoder = new TextDecoder("utf-8");
            tag.name = []
            for (let i = 4; i < tag.data.length; i++) {
                if (tag.data[i] === 0) break;
                tag.name.push(tag.data[i]);
            }
            tag.data = tag.data.slice(5 + tag.name.length);
            tag.name = decoder.decode(new Uint8Array(tag.name));
        }
        swf.tags.push(tag);
    }
    function getInstruction(x) {
        switch (x) {
            case 2: return { i: "nop" };
            case 3: return { i: "throw" };
            case 4: return { i: "getsuper", o: ["U30"], t: ["multiname"] };
            case 5: return { i: "setsuper", o: ["U30"], t: ["multiname"] };
            case 6: return { i: "dxns", o: ["U30"], t: ["string"] };
            case 7: return { i: "dxnslate" };
            case 8: return { i: "kill", o: ["U30"], t: [null] };
            case 9: return { i: "label" };
            case 12: return { i: "ifnlt", o: ["S24"], t: [null] };
            case 13: return { i: "ifnle", o: ["S24"], t: [null] };
            case 14: return { i: "ifngt", o: ["S24"], t: [null] };
            case 15: return { i: "ifnge", o: ["S24"], t: [null] };
            case 16: return { i: "jump", o: ["S24"], t: [null] };
            case 17: return { i: "iftrue", o: ["S24"], t: [null] };
            case 18: return { i: "iffalse", o: ["S24"], t: [null] };
            case 19: return { i: "ifeq", o: ["S24"], t: [null] };
            case 20: return { i: "ifne", o: ["S24"], t: [null] };
            case 21: return { i: "iflt", o: ["S24"], t: [null] };
            case 22: return { i: "ifle", o: ["S24"], t: [null] };
            case 23: return { i: "ifgt", o: ["S24"], t: [null] };
            case 24: return { i: "ifge", o: ["S24"], t: [null] };
            case 25: return { i: "ifstricteq", o: ["S24"], t: [null] };
            case 26: return { i: "ifstrictne", o: ["S24"], t: [null] };
            case 27: return { i: "lookupswitch", o: ["S24", "U30"], t: [null, null] };
            case 28: return { i: "pushwith" };
            case 29: return { i: "popscope" };
            case 30: return { i: "nextname" };
            case 31: return { i: "hasnext" };
            case 32: return { i: "pushnull" };
            case 33: return { i: "pushundefined" };
            case 35: return { i: "nextvalue" };
            case 36: return { i: "pushbyte", o: ["U8"], t: [null] };
            case 37: return { i: "pushshort", o: ["U30"], t: [null] };
            case 38: return { i: "pushtrue" };
            case 39: return { i: "pushfalse" };
            case 40: return { i: "pushnan" };
            case 41: return { i: "pop" };
            case 42: return { i: "dup" };
            case 43: return { i: "swap" };
            case 44: return { i: "pushstring", o: ["U30"], t: ["string"] };
            case 45: return { i: "pushint", o: ["U30"], t: ["integer"] };
            case 46: return { i: "pushuint", o: ["U30"], t: ["uinteger"] };
            case 47: return { i: "pushdouble", o: ["U30"], t: ["double"] };
            case 48: return { i: "pushscope" };
            case 49: return { i: "pushnamespace", o: ["U30"], t: ["namespace"] };
            case 50: return { i: "hasnext2", o: ["U30", "U30"], t: [null, null] };
            case 64: return { i: "newfunction", o: ["U30"], t: [null] };
            case 65: return { i: "call", o: ["U30"], t: [null] };
            case 66: return { i: "construct", o: ["U30"], t: [null] };
            case 67: return { i: "callmethod", o: ["U30", "U30"], t: [null, null] };
            case 68: return { i: "callstatic", o: ["U30", "U30"], t: [null, null] };
            case 69: return { i: "callsuper", o: ["U30", "U30"], t: ["multiname", null] };
            case 70: return { i: "callproperty", o: ["U30", "U30"], t: ["multiname", null] };
            case 71: return { i: "returnvoid" };
            case 72: return { i: "returnvalue" };
            case 73: return { i: "constructsuper", o: ["U30"], t: [null] };
            case 74: return { i: "constructprop", o: ["U30", "U30"], t: ["multiname", null] };
            case 76: return { i: "callproplex", o: ["U30", "U30"], t: ["multiname", null] };
            case 78: return { i: "callsupervoid", o: ["U30", "U30"], t: ["multiname", null] };
            case 79: return { i: "callpropvoid", o: ["U30", "U30"], t: ["multiname", null] };
            case 83: return { i: "applytype", o: ["U30"], t: [null] };
            case 85: return { i: "newobject", o: ["U30"], t: [null] };
            case 86: return { i: "newarray", o: ["U30"], t: [null] };
            case 87: return { i: "newactivation", t: [null] };
            case 88: return { i: "newclass", o: ["U30"], t: [null] };
            case 89: return { i: "getdescendants", o: ["U30"], t: ["multiname"] };
            case 90: return { i: "newcatch", o: ["U30"], t: [null] };
            case 93: return { i: "findpropstrict", o: ["U30"], t: ["multiname"] };
            case 94: return { i: "findproperty", o: ["U30"], t: ["multiname"] };
            case 96: return { i: "getlex", o: ["U30"], t: ["multiname"] };
            case 97: return { i: "setproperty", o: ["U30"], t: ["multiname"] };
            case 98: return { i: "getlocal", o: ["U30"], t: [null] };
            case 99: return { i: "setlocal", o: ["U30"], t: [null] };
            case 100: return { i: "getglobalscope" };
            case 101: return { i: "getscopeobject", o: ["U30"], t: [null] };
            case 102: return { i: "getproperty", o: ["U30"], t: ["multiname"] };
            case 104: return { i: "initproperty", o: ["U30"], t: ["multiname"] };
            case 106: return { i: "deleteproperty", o: ["U30"], t: ["multiname"] };
            case 108: return { i: "getslot", o: ["U30"], t: [null] };
            case 109: return { i: "setslot", o: ["U30"], t: [null] };
            case 110: return { i: "getglobalslot", o: ["U30"], t: [null] };
            case 111: return { i: "setglobalslot", o: ["U30"], t: [null] };
            case 112: return { i: "convert_s" };
            case 113: return { i: "esc_xelem" };
            case 114: return { i: "esc_xattr" };
            case 115: return { i: "convert_i" };
            case 116: return { i: "convert_o" };
            case 117: return { i: "convert_d" };
            case 118: return { i: "convert_b" };
            case 119: return { i: "convert_o" };
            case 120: return { i: "checkfilter" };
            case 128: return { i: "coerce", o: ["U30"], t: ["multiname"] };
            case 130: return { i: "coerce_a" };
            case 133: return { i: "coerce_s" };
            case 134: return { i: "astype", o: ["U30"], t: ["multiname"] };
            case 135: return { i: "astypelate" };
            case 144: return { i: "negate" };
            case 145: return { i: "increment" };
            case 146: return { i: "inclocal", o: ["U30"], t: [null] };
            case 147: return { i: "decrement" };
            case 148: return { i: "declocal", o: ["U30"], t: [null] };
            case 149: return { i: "typeof" };
            case 150: return { i: "not" };
            case 151: return { i: "bitnot" };
            case 160: return { i: "add" };
            case 161: return { i: "subtract" };
            case 162: return { i: "multiply" };
            case 163: return { i: "divide" };
            case 164: return { i: "modulo" };
            case 165: return { i: "lshift" };
            case 166: return { i: "rshift" };
            case 167: return { i: "urshift" };
            case 168: return { i: "bitand" };
            case 169: return { i: "bitor" };
            case 170: return { i: "bitxor" };
            case 171: return { i: "equals" };
            case 172: return { i: "strictequals" };
            case 173: return { i: "lessthan" };
            case 174: return { i: "lessequals" };
            case 175: return { i: "greaterthan" };
            case 176: return { i: "greaterequals" };
            case 177: return { i: "instanceof" };
            case 178: return { i: "istype", o: ["U30"], t: ["multiname"] };
            case 179: return { i: "istypelate" };
            case 180: return { i: "in" };
            case 192: return { i: "increment_i" };
            case 193: return { i: "decrement_i" };
            case 194: return { i: "inclocal_i", o: ["U30"], t: [null] };
            case 195: return { i: "declocal_i", o: ["U30"], t: [null] };
            case 196: return { i: "negate_i" };
            case 197: return { i: "add_i" };
            case 198: return { i: "subtract_i" };
            case 199: return { i: "multiply_i" };
            case 208: return { i: "getlocal0" };
            case 209: return { i: "getlocal1" };
            case 210: return { i: "getlocal2" };
            case 211: return { i: "getlocal3" };
            case 212: return { i: "setlocal0" };
            case 213: return { i: "setlocal1" };
            case 214: return { i: "setlocal2" };
            case 215: return { i: "setlocal3" };
            case 239: return { i: "debug", o: ["U8", "U30", "U8", "U30"], t: [null, "string", null, null] }
            case 240: return { i: "debugline", o: ["U30"], t: [null] };
            case 241: return { i: "debugfile", o: ["U30"], t: ["string"] };
            default: return { i: "???" };
                throw new Error("Unknown instruction type " + byte + " on body " + (i + 1) + " at " + tag.name);
        }
    }
    function loadTagDetails(tag) {
        let offset = 0;
        function readHex(len = 2) {
            let result = [];
            for (let i = 0; i < len; i++) {
                result.push(hex(dv.getUint8(offset + i)));
            }
            console.log(result.join(' '));
        }
        function read8(lock = false) { return dv.getUint8(lock ? offset : offset++); }
        function read16(le = true, lock = false) {
            if (!lock) offset += 2;
            return dv.getUint16(lock ? offset : offset - 2, le);
        }
        function read32(le = true, lock = false) {
            if (!lock) offset += 4;
            return dv.getUint32(lock ? offset : offset - 4, le);
        }
        function readU30(lock = false) {
            let result = 0;
            let shift = 0;
            let index = offset;
            while (index < tag.data.length) {
                const byte = tag.data[index];
                result |= (byte & 0x7F) << shift;
                index++;
                if (!lock) offset++;
                if (byte < 0x80) {
                    break;
                }
                shift += 7;
            }
            return result;
        }
        function readS24(lock = false) {
            if (offset + 3 > tag.data.length) throw new RangeError("readS24: out of bounds");
            const b0 = tag.data[offset];
            const b1 = tag.data[offset + 1];
            const b2 = tag.data[offset + 2];
            let value = (b0) | (b1 << 8) | (b2 << 16);
            if (value & 0x800000) value |= 0xFF000000;
            if (!lock) {
                offset += 3;
            }
            return value;
        }
        function readS32(lock = false) {
            let result = 0;
            let shift = 0;
            let index = offset;
            let byte;
            do {
                byte = tag.data[index++];
                result |= (byte & 0x7F) << shift;
                shift += 7;
            } while ((byte & 0x80) && index < tag.data.length);
            if (shift < 32 && (byte & 0x40) && shift > 7) {
                result |= (~0 << shift);
            }
            if (!lock) {
                offset = index;
            }
            return result;
        }
        function readU32(lock = false) {
            let result = 0;
            let shift = 0;
            let index = offset;
            while (index < tag.data.length) {
                const byte = tag.data[index];
                result |= (byte & 0x7F) << shift;
                index++;
                if (byte < 0x80) {
                    break;
                }
                shift += 7;
            }
            if (!lock) {
                offset = index;
            }
            return result;
        }
        function readD64(lock = false) {
            const value = dv.getFloat64(offset, true);
            if (!lock) {
                offset += 8;
            }
            return value;
        }
        let dv = new DataView(new Uint8Array(tag.data).buffer);
        if (tag.type === 'Header') {
            id('tagdetails').innerHTML = `
                <h2>Header</h2>
                <p>Signature: ${tag.data.signature}</p>
                <p>Version: ${tag.data.version}</p>
                <p>File Length: ${tag.data.fileLength} bytes</p>
                <p>Display Rect: ${tag.data.displayRect.Xmin}, ${tag.data.displayRect.Ymin} -> ${tag.data.displayRect.Xmax}, ${tag.data.displayRect.Ymax} twips (${tag.data.displayRect.Xmin / 20}, ${tag.data.displayRect.Ymin / 20} -> ${tag.data.displayRect.Xmax / 20}, ${tag.data.displayRect.Ymax / 20} px)</p>
                <p>Frame Rate: ${tag.data.frameRate} fps</p>
                <p>Frame Count: ${tag.data.frameCount}</p>
            `;
        }
        else if (tag.type === "FileAttributes") {
            console.log(tag.data);
            tag.data[0] & 0b1000;
            id('tagdetails').innerHTML = `
                <h2>FileAttributes</h2>
                <p>ReservedA: ${((tag.data[0] & 0b10000000) >> 7) == 1 ? "True" : "False"}</p>
                <p>useDirectBlit: ${((tag.data[0] & 0b01000000) >> 6) == 1 ? "True" : "False"}</p>
                <p>useGPU: ${((tag.data[0] & 0b00100000) >> 5) == 1 ? "True" : "False"}</p>
                <p>hasMetadata: ${((tag.data[0] & 0b00010000) >> 4) == 1 ? "True" : "False"}</p>
                <p>actionScript3: ${((tag.data[0] & 0b00001000) >> 3) == 1 ? "True" : "False"}</p>
                <p>noCrossDomainCache: ${((tag.data[0] & 0b00000100) >> 2) == 1 ? "True" : "False"}</p>
                <p>swfRelativeUrls: ${((tag.data[0] & 0b00000010) >> 1) == 1 ? "True" : "False"}</p>
                <p>useNetwork: ${(tag.data[0] & 0b00000001) == 1 ? "True" : "False"}</p>
                <p>ReservedB: ${tag.data[1] << 16 | tag.data[2] << 8 | tag.data[3]}</p>
            `;
        }
        else if (tag.type === "Metadata") {
            const decoder = new TextDecoder("utf-8");
            const xmlString = decoder.decode(new Uint8Array(tag.data));
            id('tagdetails').innerHTML = `
                <h2>Metadata</h2>
                <code></code>
            `;
            id('tagdetails').querySelector('code').innerText = xmlString;
        }
        else if (tag.type === "EnableDebugger" || tag.type === "EnableDebugger2") {
            id('tagdetails').innerHTML = `
                <h2>${tag.type}</h2>
                ${tag.type === "EnableDebugger2" ? `<p>Reserved: ${read16()}</p>` : ''}
                <p>Hashed Password: ${String.fromCharCode(...tag.data.slice(tag.type === "EnableDebugger2" ? 2 : 0, -1))}</p>
            `;
        }
        else if (tag.type === "DebugID") {
            id('tagdetails').innerHTML = `
                <h2>${tag.type}</h2>
                <p>ID:</p>
                <code>${tag.data.map(byte => hex(byte)).join(' ')}</code>
            `;
        }
        else if (tag.type === "ScriptLimits") {
            id('tagdetails').innerHTML = `
                <h2>ScriptLimits</h2>
                <p>Max Recursion Depth: ${read16()}</p>
                <p>Script Timeout Seconds: ${read16()}</p>
            `;
        }
        else if (tag.type === "SetBackgroundColor") {
            const colorcode = "#" + hex(read8()) + hex(read8()) + hex(read8());
            id('tagdetails').innerHTML = `
                <h2>SetBackgroundColor</h2>
                <p>Color: ${colorcode}</p>
                <div style="width: 100px; height: 100px; border-radius: 20px; background-color: ${colorcode};"></div>
            `;
        }
        else if (tag.type === "ProductInfo") {
            id('tagdetails').innerHTML = `
                <h2>ProductInfo</h2>
                <p>ID: ${read32()}</p>
                <p>Edition: ${read32()}</p>
                <p>Major Version: ${read8()}</p>
                <p>Minor Version: ${read8()}</p>
                <p>Low Build: ${read32()}</p>
                <p>High Build: ${read32()}</p>
                <p>Low Compilation Date: ${read32()}</p>
                <p>High Compilation Date: ${read32()}</p>
                <p>Data:</p>
                <code>${tag.data.map(byte => hex(byte)).join(' ')}</code>
            `;
        }
        else if (tag.type === "FrameLabel") {
            id('tagdetails').innerHTML = `
                <h2>FrameLabel</h2>
                <p>Name: ${tag.name}</p>
            `;
        }
        else if (tag.type === "DoABC") {
            id('tagdetails').innerHTML = `
                <h2>DoABC</h2>
                <p>Name: ${tag.name}</p>
                <p>Flags: ${tag.flags}</p>
                <div id="abccode">
                    <h3>ABC Code</h3>
                    <p>Version: Minor ${read16()}, Major ${read16()}</p>
                    <div style="display: flex; align-items: center; gap: 10px;margin-bottom: 10px;">
                        <h4>Constant Pool</h4>
                        <button onclick="document.getElementById('constp').classList.toggle('hidden')">Show/Hide</button>
                    </div>
                    <div id="constp" class="sitem hidden">
                        <div>
                            <p>Integers</p>
                            <div></div>
                        </div>
                        <div>
                            <p>Unsigned Integers</p>
                            <div></div>
                        </div>
                        <div>
                            <p>Doubles</p>
                            <div></div>
                        </div>
                        <div>
                            <p>Strings</p>
                            <div></div>
                        </div>
                        <div>
                            <p>Namespaces</p>
                            <div></div>
                        </div>
                        <div>
                            <p>Namespace Sets</p>
                            <div></div>
                        </div>
                        <div>
                            <p>Multinames</p>
                            <div></div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <h4>Methods</h4>
                        <button onclick="document.getElementById('pcode').classList.toggle('hidden')">Show/Hide</button>
                    </div>
                    <div id="pcode" class="sitem">

                    </div>
                </div>
            `;
            const cp = {
                int: [null],
                uint: [null],
                double: [null],
                string: [null],
                namespace: [null],
                nsset: [null],
                multiname: [null]
            };
            // Read constant pool
            {
                let count = readU30();
                for (let i = 1; i < count; i++) {
                    readHex(4);
                    cp.int.push(readS32());
                }
                if (cp.int.length > 1) cp.int.forEach((i, n) => {
                    if (n === 0) return;
                    const l = document.createElement('code');
                    const c = document.createElement('code');
                    l.innerText = (n + 1)
                    c.innerText = i.toString();
                    id("constp").children[0].children[1].appendChild(l);
                    id("constp").children[0].children[1].appendChild(c);
                });
                else id("constp").children[0].children[1].innerHTML = "<code></code><code>None</code>";

                count = readU30();
                for (let i = 1; i < count; i++) { cp.uint.push(readU32()); }
                if (cp.uint.length > 1) cp.uint.forEach((i, n) => {
                    if (n === 0) return;
                    const l = document.createElement('code');
                    const c = document.createElement('code');
                    l.innerText = (n + 1)
                    c.innerText = i.toString();
                    id("constp").children[1].children[1].appendChild(l);
                    id("constp").children[1].children[1].appendChild(c);
                });
                else id("constp").children[1].children[1].innerHTML = "<code></code><code>None</code>";

                count = readU30();
                for (let i = 1; i < count; i++) { cp.double.push(readD64()); }
                if (cp.double.length > 1) cp.double.forEach((i, n) => {
                    if (n === 0) return;
                    const l = document.createElement('code');
                    const c = document.createElement('code');
                    l.innerText = (n + 1)
                    c.innerText = i.toString();
                    id("constp").children[2].children[1].appendChild(l);
                    id("constp").children[2].children[1].appendChild(c);
                });
                else id("constp").children[2].children[1].innerHTML = "<code></code><code>None</code>";

                count = readU30();
                for (let i = 1; i < count; i++) {
                    const sl = readU30();
                    let string = "";
                    for (let j = 0; j < sl; j++) {
                        string += String.fromCharCode(read8());
                    }
                    cp.string.push(string);
                }
                if (cp.string.length > 1) cp.string.forEach((i, n) => {
                    if (n === 0) return;
                    const l = document.createElement('code');
                    const c = document.createElement('code');
                    l.innerText = (n + 1)
                    c.innerText = "\"" + i.toString() + "\"";
                    id("constp").children[3].children[1].appendChild(l);
                    id("constp").children[3].children[1].appendChild(c);
                });
                else id("constp").children[3].children[1].innerHTML = "<code></code><code>None</code>";

                count = readU30();
                for (let i = 1; i < count; i++) {
                    const namespace = {
                        type: { 0x08: "Namespace", 0x16: "PackageNamespace", 0x17: "PackageInternalNs", 0x18: "ProtectedNamespace", 0x19: "ExplicitNamespace", 0x1A: "StaticProtectedNs", 0x05: "PrivateNamespace" }[read8()]
                    };
                    if (namespace.type === undefined) namespace.type = "Unknown(" + hex(tag.data[offset]) + ")";
                    namespace.name = readU30();
                    if (namespace.name !== 0) namespace.name = cp.string[namespace.name];
                    else namespace.name = "";
                    cp.namespace.push(namespace);
                }
                if (cp.namespace.length > 1) cp.namespace.forEach((i, n) => {
                    if (n === 0) return;
                    const l = document.createElement('code');
                    const c = document.createElement('code');
                    l.innerText = (n + 1)
                    c.innerText = i.type + "(\"" + i.name + "\")";
                    id("constp").children[4].children[1].appendChild(l);
                    id("constp").children[4].children[1].appendChild(c);
                });
                else id("constp").children[4].children[1].innerHTML = "<code></code><code>None</code>";

                count = readU30();
                for (let i = 1; i < count; i++) {
                    const nc = readU30();
                    const ns = [];
                    for (let j = 0; j < nc; j++) ns.push(cp.namespace[readU30()]);
                    cp.nsset.push(ns);
                }
                if (cp.nsset.length > 1) cp.nsset.forEach((i, n) => {
                    if (n === 0) return;
                    const l = document.createElement('code');
                    const c = document.createElement('code');
                    l.innerText = (n + 1)
                    c.innerText = "[" + i.map(n => n.type + "(\"" + n.name + "\")").join(", ") + "]";
                    id("constp").children[5].children[1].appendChild(l);
                    id("constp").children[5].children[1].appendChild(c);
                });
                else id("constp").children[5].children[1].innerHTML = "<code></code><code>None</code>";


                count = readU30();
                for (let i = 1; i < count; i++) {
                    const multiname = {
                        type: read8()
                    };
                    if (multiname.type == 0x07) multiname.type = "QName";
                    else if (multiname.type == 0x0D) multiname.type = "QNameA";
                    else if (multiname.type == 0x0F) multiname.type = "RTQName";
                    else if (multiname.type == 0x10) multiname.type = "RTQNameA";
                    else if (multiname.type == 0x11) multiname.type = "RTQNameL";
                    else if (multiname.type == 0x12) multiname.type = "RTQNameLA";
                    else if (multiname.type == 0x09) multiname.type = "Multiname";
                    else if (multiname.type == 0x0E) multiname.type = "MultinameA";
                    else if (multiname.type == 0x1B) multiname.type = "MultinameL";
                    else if (multiname.type == 0x1C) multiname.type = "MultinameLA";
                    else if (multiname.type == 0x1D) multiname.type = "TypeName";
                    else multiname.type = "Unknown" + hex(multiname.type);
                    if (["QName", "QNameA"].includes(multiname.type)) {
                        multiname.namespace = readU30();
                        multiname.namespace = multiname.namespace == 0 ? "*" : cp.namespace[multiname.namespace];
                        multiname.name = readU30();
                        multiname.name = multiname.name == 0 ? "*" : cp.string[multiname.name];
                    }
                    else if (["RTQName", "RTQNameA"].includes(multiname.type)) {
                        multiname.name = readU30();
                        multiname.name = multiname.name == 0 ? "*" : cp.string[multiname.name];
                    }
                    else if (["Multiname", "MultinameA"].includes(multiname.type)) {
                        multiname.name = readU30();
                        multiname.name = multiname.name == 0 ? "*" : cp.string[multiname.name];
                        multiname.nsset = readU30();
                        if (multiname.nsset !== 0) {
                            multiname.nsset = cp.nsset[multiname.nsset];
                        }
                    }
                    else if (["MultinameL", "MultinameLA"].includes(multiname.type)) {
                        multiname.nsset = readU30();
                        if (multiname.nsset !== 0) {
                            multiname.nsset = cp.nsset[multiname.nsset];
                        }
                    }
                    else if (["TypeName"].includes(multiname.type)) {
                        multiname.qname = readU30();
                        multiname.qname = cp.multiname[multiname.qname];
                        const pcount = readU30();
                        multiname.params = [];
                        for (let j = 0; j < pcount; j++) {
                            multiname.params.push(cp.multiname[readU30()]);
                        }
                    }
                    cp.multiname.push(multiname);
                }
                if (cp.multiname.length > 1) cp.multiname.forEach((i, n) => {
                    if (n === 0) return;
                    const l = document.createElement('code');
                    const c = document.createElement('code');
                    l.innerText = (n + 1)
                    c.innerText = i.type + (i.nsset ? ("(\"" + i.name + "\", [" + i.nsset.map(n => n.type + "(\"" + n.name + "\")").join(", ") + "])") : (i.namespace ? "(" + i.namespace.type + "(\"" + i.namespace.name + "\")" : "") + ", \"" + (i.name || "") + "\")");
                    id("constp").children[6].children[1].appendChild(l);
                    id("constp").children[6].children[1].appendChild(c);
                });
                else id("constp").children[6].children[1].innerHTML = "<code></code><code>None</code>";
            }
            const methods = [];
            const mc = readU30();
            // Read method headers
            {
                for (let i = 0; i < mc; i++) {
                    const pc = readU30();
                    let method = {
                        ret_type: cp.multiname[readU30()],
                        params: [],
                        flags: {}
                    };
                    for (let p = 0; p < pc; p++) {
                        const ptype = readU30();
                        method.params.push({type: ptype == 0 ? "*" : cp.multiname[ptype]});
                    }
                    method.name = cp.string[readU30()];
                    let flag = read8();
                    if (flag & 0x80) method.flags.hasParamNames = true;
                    if (flag & 0x40) method.flags.setDxns = true;
                    if (flag & 0x08) method.flags.hasOptional = true;
                    if (flag & 0x04) method.flags.needRest = true;
                    if (flag & 0x02) method.flags.needActivation = true;
                    if (flag & 0x01) method.flags.needArguments = true;
                    if (method.flags.hasOptional) {
                        const oc = readU30();
                        method.optionals = [];
                        for (let p = 0; p < oc; p++) {
                            let opt = {
                                val: readU30(),
                                kind: read8()
                            };
                            if (opt.kind === 0x03) opt = { kind: "Int", val: cp.integer[opt.val] };
                            else if (opt.kind === 0x04) opt = { kind: "UInt", val: cp.uinteger[opt.val] };
                            else if (opt.kind === 0x06) opt = { kind: "Double", val: cp.double[opt.val] };
                            else if (opt.kind === 0x0B) opt = { kind: "True" };
                            else if (opt.kind === 0x0A) opt = { kind: "False" };
                            else if (opt.kind === 0x0C) opt = { kind: "Null" };
                            else if (opt.kind === 0x00) opt = { kind: "Undefined" };
                            else if ([0x08, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x05].includes(opt.kind)) {
                                opt.val = cp.namespace[opt.val];
                                if (opt.kind === 0x08) opt.kind = "Namespace";
                                else if (opt.kind === 0x16) opt.kind = "PackageNamespace";
                                else if (opt.kind === 0x17) opt.kind = "PackageInternalNs";
                                else if (opt.kind === 0x18) opt.kind = "ProtectedNamespace";
                                else if (opt.kind === 0x19) opt.kind = "ExplicitNamespace";
                                else if (opt.kind === 0x1A) opt.kind = "StaticProtectedNs";
                                else if (opt.kind === 0x05) opt.kind = "PrivateNamespace";
                            }
                            method.optionals.push(opt);
                        }
                    }
                    if (method.flags.hasParamNames) {
                        for (let p = 0; p < pc; p++) {
                            method.params[p].name = cp.string[readU30()];
                        }
                    }
                    methods.push(method);
                }
            }
            const metadata = [];
            const tc = readU30();
            // Read metadata
            {
                for (let i = 0; i < tc; i++) {
                    let md = {
                        name: cp.string[readU30()],
                        values: []
                    };
                    const vc = readU30();
                    for (let j = 0; j < vc; j++) md.values.push({ key: cp.string[readU30()] });
                    for (let j = 0; j < vc; j++) md.values[j].value = cp.string[readU30()];
                    metadata.push(md);
                }
            }
            const classes = [];
            const cc = readU30();
            // Read class definitions
            {
                for (let i = 0; i < cc; i++) {
                    const trc = {
                        instance: {
                            name: cp.string[readU30()],
                            super_index: readU30(),
                            flags: {},
                            interfaces: [],
                        },
                        class: {}
                    }
                    const flag = read8();
                    if (flag & 0x08) trc.instance.flags.ClassProtectedNs = true;
                    if (flag & 0x04) trc.instance.flags.ClassInterface = true;
                    if (flag & 0x02) trc.instance.flags.ClassSealed = true;
                    if (flag & 0x01) trc.instance.flags.ClassFinal = true;
                    if (trc.instance.flags.ClassProtectedNs) trc.instance.protectedNS = readU30();
                    const ic = readU30();
                    for (let j = 0; j < ic; j++) trc.instance.interfaces.push(readU30());
                    trc.instance.iinit_index = readU30();
                    const ttc = readU30();
                    trc.instance.traits = [];
                    for (let j = 0; j < ttc; j++) {
                        const trait = {
                            name: cp.string[readU30()],
                            vector: parseInt(bin(read8(true)).substring(0, 4), 2),
                            type: ["Slot", "Method", "Getter", "Setter", "Class", "Function", "Const"][parseInt(bin(read8()).substring(4), 2)]
                        };
                        trait.final = Boolean(trait.vector & 0x01);
                        trait.override = Boolean(trait.vector & 0x02);
                        trait.metadata = Boolean(trait.vector & 0x04);
                        if (trait.type == "Slot" || trait.type == "Const") {
                            trait.slot_id = readU30();
                            trait.type_index = readU30();
                            trait.value_index = readU30();
                            if (trait.value_index != 0) trait.value_kind = read8();
                        }
                        else if (trait.type == "Method" || trait.type == "Getter" || trait.type == "Setter") {
                            trait.disp_id = readU30();
                            trait.method_info = readU30();
                        }
                        else if (trait.type == "Class") {
                            trait.slot_id = readU30();
                            trait.class_index = readU30();
                        }
                        else if (trait.type == "Function") {
                            trait.slot_id = readU30();
                            trait.function = readU30();
                        }
                        if (trait.metadata) {
                            const mtc = readU30();
                            trait.metadata = [];
                            for (let mtd = 0; mtd < mtc; mtd++) {
                                trait.metadata.push(readU30());
                            }
                        }
                        trc.instance.traits.push(trait);
                    }


                    classes.push(trc);
                }
                for (let i = 0; i < cc; i++) {
                    classes[i].class.cinit_index = readU30();
                    const stc = readU30();
                    classes[i].class.static_traits = [];
                    for (let j = 0; j < stc; j++) {
                        const trait = {};
                        trait.name = cp.string[readU30()];
                        trait.vector = parseInt(bin(read8(true)).substring(0, 4), 2);
                        trait.type = ["Slot", "Method", "Getter", "Setter", "Class", "Function", "Const"][parseInt(bin(read8()).substring(4), 2)];
                        trait.final = Boolean(trait.vector & 0x01);
                        trait.override = Boolean(trait.vector & 0x02);
                        trait.metadata = Boolean(trait.vector & 0x04);
                        if (trait.type == "Slot" || trait.type == "Const") {
                            trait.slot_id = readU30();
                            trait.type_index = readU30();
                            trait.value_index = readU30();
                            if (trait.value_index != 0) trait.value_kind = read8();
                        }
                        else if (trait.type == "Method" || trait.type == "Getter" || trait.type == "Setter") {
                            trait.disp_id = readU30();
                            trait.method_info = readU30();
                        }
                        else if (trait.type == "Class") {
                            trait.slot_id = readU30();
                            trait.class_index = readU30();
                        }
                        else if (trait.type == "Function") {
                            trait.slot_id = readU30();
                            trait.function = readU30();
                        }
                        if (trait.metadata) {
                            const mtc = readU30();
                            trait.metadata = [];
                            for (let mtd = 0; mtd < mtc; mtd++) {
                                trait.metadata.push(readU30());
                            }
                        }
                        classes[i].class.static_traits.push(trait);
                    }
                }
            }
            const scripts = [];
            const sc = readU30();
            // Read script definitions
            {
                for (let i = 0; i < sc; i++) {
                    const s = {
                        init_index: readU30(),
                        traits: []
                    };
                    const trc = readU30();
                    s.traits = [];
                    for (let j = 0; j < trc; j++) {
                        const trait = {
                            name: cp.string[readU30()],
                            vector: parseInt(bin(read8(true)).substring(0, 4), 2),
                            type: ["Slot", "Method", "Getter", "Setter", "Class", "Function", "Const"][parseInt(bin(read8()).substring(4), 2)]
                        };
                        trait.final = Boolean(trait.vector & 0x01);
                        trait.override = Boolean(trait.vector & 0x02);
                        trait.metadata = Boolean(trait.vector & 0x04);
                        if (trait.type == "Slot" || trait.type == "Const") {
                            trait.slot_id = readU30();
                            trait.type_index = readU30();
                            trait.value_index = readU30();
                            if (readU30() != 0) trait.value_kind = read8();
                        }
                        else if (trait.type == "Method" || trait.type == "Getter" || trait.type == "Setter") {
                            trait.disp_id = readU30();
                            trait.method_info = readU30();
                        }
                        else if (trait.type == "Class") {
                            trait.slot_id = readU30();
                            trait.class_index = readU30();
                        }
                        else if (trait.type == "Function") {
                            trait.slot_id = readU30();
                            trait.function = readU30();
                        }
                        if (trait.metadata) {
                            const tmc = readU30();
                            trait.metadata = [];
                            for (let mtd = 0; mtd < tmc; mtd++) trait.metadata.push(readU30());
                        }
                        s.traits.push(trait);
                    }
                    scripts.push(s);
                }
            }
            const bodies = [];
            const bc = readU30();
            // Read method bodies
            {
                for (let i = 0; i < bc; i++) {
                    const body = {
                        method_info: readU30(),
                        max_stack: readU30(),
                        max_regs: readU30(),
                        init_scope_depth: readU30(),
                        max_scope_depth: readU30(),
                        codeBytes: [],
                        exception: [],
                        traits: []
                    };
                    const cs = readU30();
                    const code = [];
                    for (let j = 0; j < cs; j++) body.codeBytes.push(read8());
                    const exc = readU30();
                    for (let j = 0; j < exc; j++) body.exception.push({ from: readU30(), to: readU30(), target: readU30(), exc_type: readU30(), var_name: readU30() });
                    const trc = readU30();
                    for (let j = 0; j < trc; j++) {
                        const trait = {
                            name: cp.string[readU30()],
                            vector: parseInt(bin(read8(true)).substring(0, 4), 2),
                            type: ["Slot", "Method", "Getter", "Setter", "Class", "Function", "Const"][parseInt(bin(read8()).substring(4), 2)]
                        };
                        trait.final = Boolean(trait.vector & 0x01);
                        trait.override = Boolean(trait.vector & 0x02);
                        trait.metadata = Boolean(trait.vector & 0x04);
                        if (trait.type == "Slot" || trait.type == "Const") {
                            trait.slot_id = readU30();
                            trait.type_index = readU30();
                            trait.value_index = readU30();
                            if (trait.value_index != 0) trait.value_kind = read8();
                        }
                        else if (trait.type == "Method" || trait.type == "Getter" || trait.type == "Setter") {
                            trait.disp_id = readU30();
                            trait.method_info = readU30();
                        }
                        else if (trait.type == "Class") {
                            trait.slot_id = readU30();
                            trait.class_index = readU30();
                        }
                        else if (trait.type == "Function") {
                            trait.slot_id = readU30();
                            trait.function = readU30();
                        }
                        if (trait.metadata) {
                            const tmc = readU30();
                            trait.metadata = [];
                            for (let mtd = 0; mtd < tmc; mtd++) trait.metadata.push(readU30());
                        }
                        body.traits.push(trait);
                    }
                    bodies.push(body);
                }
            }
            // Read method byte codes
            {
                for (let i = 0; i < bodies.length; i++) {
                    const code = bodies[i].codeBytes;
                    bodies[i].code = [];
                    const actualtagdata = tag.data;
                    tag.data = code;
                    dv = new DataView(new Uint8Array(code).buffer);
                    offset = 0;
                    while (offset < code.length) {
                        const instruction = getInstruction(read8());
                        if (instruction.o) {
                            for (let j = 0; j < instruction.o.length; j++) {
                                if (instruction.o[j] === "U8") instruction.o[j] = read8();
                                else if (instruction.o[j] == "U30" || instruction.o[j] == "S24") {
                                    const type = instruction.o[j];
                                    instruction.o[j] = (type == "U30") ? readU30() : ((type == "S24") ? readS24() : null);
                                    if (instruction.i == "lookupswitch" && type == "U30") {
                                        for (let k = -1; k < instruction.o[j]; k++) {
                                            instruction.o.push("S24");
                                            instruction.t.push(null);
                                        }
                                    }
                                }
                            }
                            for (let j = 0; j < instruction.t.length; j++) {
                                if (["string", "integer", "uinteger", "multiname", "namespace", "nsset"].includes(instruction.t[j])) {
                                    instruction.o[j] = cp[instruction.t[j]][instruction.o[j]];
                                }
                            }
                            delete instruction.t;
                        }
                        bodies[i].code.push(instruction);
                    }
                    delete bodies[i].codeBytes;
                    methods[bodies[i].method_info].body = bodies[i];
                    tag.data = actualtagdata;
                }
            }
            methods.forEach((method, index) => {
                const me = document.createElement('div');
                me.innerHTML = `
                    <code style="text-align: left;">${method.ret_type ? method.ret_type.name : "void"} ${method.name}(${method.params.map(p => p.type.name + " " + p.name).join(", ")})</code>
                    <div></div>
                `;
                if (method.body) method.body.code.forEach((instruction, ix) => {
                    const i = document.createElement('code');
                    const o = document.createElement('code');
                    i.innerText = ix + 1;
                    o.innerText = instruction.i;
                    if (instruction.o) {
                        instruction.o.forEach(op => {
                            if (typeof op === "string") op = "\"" + op + "\"";
                            else if (typeof op === "object") {
                                let string = op.type + (op.nsset ? ("(\"" + op.name + "\", [" + op.nsset.map(n => n.type + "(\"" + n.name + "\")").join(", ") + "])") : (op.namespace ? "(" + op.namespace.type + "(\"" + op.namespace.name + "\")" : "") + ", \"" + (op.name || "") + "\")");
                                op = string;

                            }
                            o.innerText += " " + op;
                        });
                    }
                    me.children[1].appendChild(i);
                    me.children[1].appendChild(o);
                });
                else {
                    const i = document.createElement('code');
                    i.innerText = "No body provided";
                    me.children[1].appendChild(i);
                }
                id("pcode").appendChild(me);
            });
        }
        else {
            id('tagdetails').innerHTML = `
                <h2>${tag.type}</h2>
                <p>Length: ${tag.length} bytes</p>
                <p>Data:</p>
                <code>${tag.data.map(byte => hex(byte)).join(' ')}</code>
            `;
        }
    }
    document.body.innerHTML = '<div id="header"></div><div id="page"><div id="tags"></div><div id="dragbar"></div><div id="tagdetails"></div></div>';
    id("dragbar").addEventListener('mousedown', (e) => {
        e.preventDefault();
        document.addEventListener('mousemove', resizeWidth);
        document.addEventListener('mouseup', stopResize);
    });
    function resizeWidth(e) { if (e.clientX >= 250 && e.clientX <= 700) id("tags").style.width = e.clientX + 'px'; }
    function stopResize() {
        document.removeEventListener('mousemove', resizeWidth);
        document.removeEventListener('mouseup', stopResize);
    }
    const hb = document.createElement('button');
    hb.innerHTML = '<h4>Header Data</h4><span></span>';
    hb.children[1].innerText = name;
    hb.classList.add('selected');
    hb.addEventListener('click', () => {
        cls('selected').forEach(e => e.classList.remove('selected'));
        hb.classList.add('selected');
        localStorage.setItem("Tag:" + name, 0);
        loadTagDetails({ type: 'Header', data: swf.header });
    });
    loadTagDetails({ type: 'Header', data: swf.header });
    id("tags").appendChild(hb);
    swf.tags.forEach((tag, index) => {
        const b = document.createElement('button');
        b.innerHTML = `<h4 style="overflow-wrap: break-word;">Unnamed</h4><span></span>`;
        b.children[1].innerText = tag.type + " - " + tag.length + " bytes";
        if (tag.name) {
            b.children[0].innerText = tag.name.replaceAll("/", " /");
            b.children[1].innerText = tag.type + " - " + tag.length + " bytes";
        }
        b.addEventListener('click', () => {
            cls('selected').forEach(e => e.classList.remove('selected'));
            b.classList.add('selected');
            localStorage.setItem("Tag:" + name, index + 1);
            loadTagDetails(tag);
        });
        id("tags").appendChild(b);
    });
    if (localStorage.getItem("Tag:" + name) !== null) {
        id("tags").children[parseInt(localStorage.getItem("Tag:" + name))].click();
    }
};