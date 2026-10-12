import { Database } from "../Database";
import { Settings } from "./Settings";

/** Ustawienia siedzą w bazie pod jednym kluczem, więc gra i edytor zawsze widzą to samo. */
export class SettingsRepository
{
    private readonly database: Database;

    public constructor(database: Database)
    {
        this.database = database;
    }

    public async load(): Promise<Settings>
    {
        const settings: Settings = new Settings();
        const record: Record<string, uint>|null = await this.database.getSettings();

        if (record !== null) {
            settings.fromRecord(record);
        }

        return settings;
    }

    public async save(settings: Settings): Promise<void>
    {
        await this.database.saveSettings(settings.toRecord());
    }
}
