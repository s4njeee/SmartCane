import * as Localization from "expo-localization";
import { I18n } from "i18n-js";

const translations = {
  en: {
    profile: "Profile",
    account: "Account",
    settings: "Settings",
    editProfile:
      "Edit Profile",
    changePassword:
      "Change Password",
    language:
      "Language",
    darkMode:
      "Dark Mode",
    notifications:
      "Notifications",
    support:
      "Support",
    logout:
      "Logout",
    enabled:
      "Enabled",
  },

  tl: {
    profile:
      "Profile",
    account:
      "Account",
    settings:
      "Mga Setting",
    editProfile:
      "I-edit ang Profile",
    changePassword:
      "Palitan ang Password",
    language:
      "Wika",
    darkMode:
      "Dark Mode",
    notifications:
      "Mga Notification",
    support:
      "Suporta",
    logout:
      "Mag Logout",
    enabled:
      "Naka-on",
  },
};

const i18n =
  new I18n(
    translations
  );

const locale =
  Localization.getLocales()[0]
    ?.languageCode ||
  "en";

i18n.locale =
  locale === "tl"
    ? "tl"
    : "en";

i18n.enableFallback =
  true;

export default i18n;