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
        // sign-extend 24 -> 32 bits
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
    for (let i = 0; i < bytesneeded; i++) {
        displayrect += bin(read8());
    }
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
    console.log(swf);













    function loadTagDetails(tag) {
        console.log(tag);

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
            // sign-extend 24 -> 32 bits
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
                    <h4>Constant Pool</h4>
                    <div id="constp">
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
                </div>
                <p>Rest of the bytes:</p>
                <code id="rawcode">${tag.data.map(byte => hex(byte)).join(' ')}</code>
            `;
            const cp = {
                int: [],
                uint: [],
                double: [],
                string: [],
                namespace: [],
                nsset: [],
                multiname: []
            };
            // Read constant pool
            {
                let count = readU30();
                for (let i = 1; i < count; i++) {
                    readHex(4);
                    cp.int.push(readS32());
                }
                if (cp.int.length) cp.int.forEach((i,n) => {
                        const l = document.createElement('code');
                        const c = document.createElement('code');
                        l.innerText = (n+1)
                        c.innerText = i.toString();
                        id("constp").children[0].children[1].appendChild(l);
                        id("constp").children[0].children[1].appendChild(c);
                });
                else id("constp").children[0].children[1].innerHTML = "<code></code><code>None</code>";
                
                count = readU30();
                for (let i = 1; i < count; i++) {cp.uint.push(readU32());}
                if (cp.uint.length) cp.uint.forEach((i,n) => {
                        const l = document.createElement('code');
                        const c = document.createElement('code');
                        l.innerText = (n+1)
                        c.innerText = i.toString();
                        id("constp").children[1].children[1].appendChild(l);
                        id("constp").children[1].children[1].appendChild(c);
                });
                else id("constp").children[1].children[1].innerHTML = "<code></code><code>None</code>";

                count = readU30();
                for (let i = 1; i < count; i++) {cp.double.push(readD64());}
                if (cp.double.length) cp.double.forEach((i,n) => {
                        const l = document.createElement('code');
                        const c = document.createElement('code');
                        l.innerText = (n+1)
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
                if (cp.string.length) cp.string.forEach((i,n) => {
                        const l = document.createElement('code');
                        const c = document.createElement('code');
                        l.innerText = (n+1)
                        c.innerText = "\"" + i.toString() + "\"";
                        id("constp").children[3].children[1].appendChild(l);
                        id("constp").children[3].children[1].appendChild(c);
                });
                else id("constp").children[3].children[1].innerHTML = "<code></code><code>None</code>";

                count = readU30();
                for (let i = 1; i < count; i++) {
                    const namespace = {
                        type: {0x08:"Namespace",0x16:"PackageNamespace",0x17:"PackageInternalNs",0x18:"ProtectedNamespace",0x19:"ExplicitNamespace",0x1A:"StaticProtectedNs",0x05:"PrivateNamespace"}[read8()]
                    };
                    if (namespace.type === undefined) namespace.type = "Unknown(" + hex(tag.data[offset - 1]) + ")";
                    namespace.name = readU30();
                    if (namespace.name !== 0) namespace.name = cp.string[namespace.name - 1];
                    else namespace.name = "";
                    cp.namespace.push(namespace);
                }
                if (cp.namespace.length) cp.namespace.forEach((i,n) => {
                        const l = document.createElement('code');
                        const c = document.createElement('code');
                        l.innerText = (n+1)
                        c.innerText = i.type + "(\"" + i.name + "\")";
                        id("constp").children[4].children[1].appendChild(l);
                        id("constp").children[4].children[1].appendChild(c);
                });
                else id("constp").children[4].children[1].innerHTML = "<code></code><code>None</code>";

                count = readU30();
                for (let i = 1; i < count; i++) {
                    const nc = readU30();
                    const ns = [];
                    for (let j = 0; j < nc; j++) ns.push(cp.namespace[readU30()-1]);
                    cp.nsset.push(ns);
                }
                if (cp.nsset.length) cp.nsset.forEach((i,n) => {
                        const l = document.createElement('code');
                        const c = document.createElement('code');
                        l.innerText = (n+1)
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
                        multiname.namespace = multiname.namespace == 0 ? "*" : cp.namespace[multiname.namespace - 1];
                        multiname.name = readU30();
                        multiname.name = multiname.name == 0 ? "*" : cp.string[multiname.name - 1];
                    }
                    else if (["RTQName", "RTQNameA"].includes(multiname.type)) {
                        multiname.name = readU30();
                        multiname.name = multiname.name == 0 ? "*" : cp.string[multiname.name - 1];
                    }
                    else if (["Multiname", "MultinameA"].includes(multiname.type)) {
                        multiname.name = readU30();
                        multiname.name = multiname.name == 0 ? "*" : cp.string[multiname.name - 1];
                        multiname.nsset = readU30();
                        if (multiname.nsset !== 0) {
                            multiname.nsset = cp.nsset[multiname.nsset - 1];
                        }
                    }
                    else if (["MultinameL", "MultinameLA"].includes(multiname.type)) {
                        multiname.nsset = readU30();
                        if (multiname.nsset !== 0) {
                            multiname.nsset = cp.nsset[multiname.nsset - 1];
                        }
                    }
                    else if (["TypeName"].includes(multiname.type)) {
                        multiname.qname = readU30();
                        multiname.qname = cp.multiname[multiname.qname - 1];
                        const pcount = readU30();
                        multiname.params = [];
                        for (let j = 0; j < pcount; j++) {
                            multiname.params.push(cp.multiname[readU30() - 1]);
                        }
                    }
                    cp.multiname.push(multiname);
                }
                if (cp.multiname.length) cp.multiname.forEach((i,n) => {
                        const l = document.createElement('code');
                        const c = document.createElement('code');
                        l.innerText = (n+1)
                        c.innerText = i.type + (i.nsset ? ("(\""+i.name+"\", [" + i.nsset.map(n => n.type + "(\"" + n.name + "\")").join(", ") + "])") : (i.namespace ? "(" + i.namespace.type + "(\"" + i.namespace.name + "\")" : "") + ", \"" + (i.name || "") + "\")");
                        id("constp").children[6].children[1].appendChild(l);
                        id("constp").children[6].children[1].appendChild(c);
                });
                else id("constp").children[6].children[1].innerHTML = "<code></code><code>None</code>";
            }
            

            {
                const mc = readU30();
            }



            id("rawcode").innerText = tag.data.slice(offset).map(byte => hex(byte)).join(' ');
            console.log(id("rawcode"));
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
    document.body.innerHTML = '<div id="header"></div><div id="page"><div id="tags"></div><div id="tagdetails"></div></div>';
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