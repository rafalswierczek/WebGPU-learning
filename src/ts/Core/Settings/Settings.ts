import { GameConfig } from "../Config/GameConfig";
import { ResolutionConfig } from "../Config/ResolutionConfig";

/**
 * Ustawienia gry trzymane pod jednym kluczem w bazie, wspólne dla gry i edytora mapy -
 * zmiana rozdzielczości w edytorze obowiązuje też w menu głównym i odwrotnie.
 */
export class Settings
{
    public static readonly DEFAULT_VOLUME: uint = 50;

    private resolutionIndex: uint = ResolutionConfig.DEFAULT_INDEX;
    private difficulty: uint = 1;
    private musicVolume: uint = Settings.DEFAULT_VOLUME;
    private soundVolume: uint = Settings.DEFAULT_VOLUME;
    private autosaveMinutes: uint = GameConfig.AUTOSAVE_MINUTES[1];

    public getResolutionIndex(): uint
    {
        return this.resolutionIndex;
    }

    public setResolutionIndex(index: uint): void
    {
        this.resolutionIndex = Math.min(Math.max(0, index), ResolutionConfig.SIZES.length - 1);
    }

    public getResolution(): { width: uint, height: uint }
    {
        return ResolutionConfig.SIZES[this.resolutionIndex];
    }

    public getDifficulty(): uint
    {
        return this.difficulty;
    }

    public getDifficultyName(): string
    {
        return GameConfig.DIFFICULTIES[this.difficulty] ?? 'Unknown';
    }

    public nextDifficulty(): void
    {
        this.difficulty = (this.difficulty + 1) % GameConfig.DIFFICULTIES.length;
    }

    public getMusicVolume(): uint
    {
        return this.musicVolume;
    }

    public setMusicVolume(value: uint): void
    {
        this.musicVolume = Settings.clampVolume(value);
    }

    public getSoundVolume(): uint
    {
        return this.soundVolume;
    }

    public setSoundVolume(value: uint): void
    {
        this.soundVolume = Settings.clampVolume(value);
    }

    public getAutosaveMinutes(): uint
    {
        return this.autosaveMinutes;
    }

    public setAutosaveMinutes(minutes: uint): void
    {
        this.autosaveMinutes = minutes;
    }

    /** Zwykły obiekt, bo IndexedDB zapisuje go strukturalnym klonem bez własnego kodeka */
    public toRecord(): Record<string, uint>
    {
        return {
            resolutionIndex: this.resolutionIndex,
            difficulty: this.difficulty,
            musicVolume: this.musicVolume,
            soundVolume: this.soundVolume,
            autosaveMinutes: this.autosaveMinutes,
        };
    }

    public fromRecord(record: Record<string, uint>): void
    {
        this.setResolutionIndex(record.resolutionIndex ?? this.resolutionIndex);
        this.difficulty = record.difficulty ?? this.difficulty;
        this.musicVolume = Settings.clampVolume(record.musicVolume ?? this.musicVolume);
        this.soundVolume = Settings.clampVolume(record.soundVolume ?? this.soundVolume);
        this.autosaveMinutes = record.autosaveMinutes ?? this.autosaveMinutes;
    }

    private static clampVolume(value: uint): uint
    {
        return Math.round(Math.min(100, Math.max(0, value)));
    }
}
