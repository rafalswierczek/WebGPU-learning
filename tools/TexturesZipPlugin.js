const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

/**
 * Pakuje caly folder assets/Textures do public/assets/textures.zip przy kazdym buildzie.
 *
 * Gra pobiera ten jeden plik raz, rozpakowuje go w przegladarce i zapisuje do IndexedDB -
 * dzieki temu start nie robi 463 osobnych zapytan HTTP, a przegladarka nie musi umiec
 * wylistowac katalogu (czego nie umie).
 *
 * Zawartosc zipa to dokladnie drzewo z dysku: sciezka w zipie = sciezka wzgledem Textures.
 *
 * Przy okazji kopiuje luzne pliki z assets/ (czcionka, kursor) do public/assets/, zeby folder
 * assets/ byl jedynym miejscem, ktore sie edytuje - inaczej kazda podmiana czcionki wymagalaby
 * pamietania o recznej kopii.
 */
class TexturesZipPlugin
{
    constructor(options)
    {
        this.sourceDir = options.sourceDir;
        this.outputFile = options.outputFile;
    }

    apply(compiler)
    {
        compiler.hooks.beforeCompile.tapPromise('TexturesZipPlugin', async () => {
            this.copyLooseAssets();

            return this.build();
        });
    }

    /** Pliki lezace bezposrednio w assets/ - bez podfolderow, bo Textures ida do zipa */
    copyLooseAssets()
    {
        const sourceDir = path.dirname(this.sourceDir);
        const targetDir = path.dirname(this.outputFile);

        fs.mkdirSync(targetDir, { recursive: true });

        for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                continue;
            }

            const source = path.join(sourceDir, entry.name);
            const target = path.join(targetDir, entry.name);

            // kopiujemy tylko to, co sie zmienilo - inaczej kazdy build przepisuje wszystko
            if (fs.existsSync(target) && fs.statSync(target).mtimeMs >= fs.statSync(source).mtimeMs) {
                continue;
            }

            fs.copyFileSync(source, target);
            console.log(`\nasset copied: ${entry.name}`);
        }
    }

    async build()
    {
        if (!fs.existsSync(this.sourceDir)) {
            throw new Error(`TexturesZipPlugin: missing ${this.sourceDir}`);
        }

        const zip = new JSZip();
        const files = [];

        TexturesZipPlugin.collect(this.sourceDir, '', files);

        for (const file of files) {
            zip.file(file.relative, fs.readFileSync(file.absolute));
        }

        const buffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            // pliki sa juz skompresowane (png), wiec mocniejsza kompresja tylko kosztuje czas
            compressionOptions: { level: 1 },
        });

        fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
        fs.writeFileSync(this.outputFile, buffer);

        console.log(`\ntextures.zip: ${files.length} files, ${Math.round(buffer.length / 1024)} KB`);
    }

    /** Foldery i pliki alfabetycznie, zeby zip nie zmienial sie bez powodu miedzy buildami */
    static collect(dir, relative, into)
    {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
            .sort((a, b) => a.name.localeCompare(b.name));

        for (const entry of entries) {
            const absolute = path.join(dir, entry.name);
            const entryRelative = relative === '' ? entry.name : `${relative}/${entry.name}`;

            if (entry.isDirectory()) {
                TexturesZipPlugin.collect(absolute, entryRelative, into);

                continue;
            }

            const extension = path.extname(entry.name).toLowerCase();

            if (extension === '.png' || entry.name.toLowerCase() === 'config.json') {
                into.push({ absolute: absolute, relative: entryRelative });
            }
        }
    }
}

module.exports = TexturesZipPlugin;
