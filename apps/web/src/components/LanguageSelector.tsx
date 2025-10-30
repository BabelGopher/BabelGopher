/**
 * Language Selector Component
 * Dropdown for selecting target translation language
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'zh', name: '中文 (Chinese)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'it', name: 'Italiano (Italian)' },
  { code: 'pt', name: 'Português (Portuguese)' },
  { code: 'ru', name: 'Русский (Russian)' },
] as const; // Use 'as const' for stricter typing

// Extract language codes into a separate array
export const SUPPORTED_LANGUAGE_CODES = SUPPORTED_LANGUAGES.map(
  (lang) => lang.code
);

// Define the type for supported language codes
export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGE_CODES[number];

/**
 * Type guard to check if a string is a valid SupportedLanguageCode.
 * @param code The code to validate.
 * @returns True if the code is a valid language code.
 */
export function isValidLanguageCode(code: unknown): code is SupportedLanguageCode {
  return typeof code === 'string' && SUPPORTED_LANGUAGE_CODES.includes(code as SupportedLanguageCode);
}

interface LanguageSelectorProps {
  selectedLanguage: string;
  onChange: (langCode: SupportedLanguageCode) => void;
  className?: string;
}

export function LanguageSelector({
  selectedLanguage,
  onChange,
  className = ''
}: LanguageSelectorProps) {
  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <label
        htmlFor="language-select"
        className="text-sm font-medium text-gray-700"
      >
        Translation Language
      </label>
      <select
        id="language-select"
        value={selectedLanguage}
        onChange={(e) => onChange(e.target.value as SupportedLanguageCode)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
        aria-label="Select target language for translation"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
