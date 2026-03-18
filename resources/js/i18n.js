import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ro from "./locales/ro.json";

const SUPPORTED_LANGUAGES = ["en", "ro"];
const DEFAULT_LANGUAGE = "en";

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ro: { translation: ro },
        },
        supportedLngs: SUPPORTED_LANGUAGES,
        fallbackLng: DEFAULT_LANGUAGE,
        defaultNS: "translation",
        ns: ["translation"],
        detection: {
            order: ["localStorage", "htmlTag", "navigator"],
            caches: ["localStorage"],
        },
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;
