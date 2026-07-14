"use client";

// Two full dictionaries + a context that flips document.dir automatically.
// Rule for RTL in components: always use logical Tailwind utilities
// (ps-*/pe-*, start-*/end-*) and `rtl:rotate-180` on directional arrows.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

const dict = {
  ar: {
    appName: "كتابي الحي",
    tagline: "اجعل صور كتب الأطفال تنبض بالحياة",
    dashboard: "لوحة التحكم",
    myBooks: "كتبي",
    newBook: "كتاب جديد",
    noBooksYet: "لا توجد كتب بعد — أنشئ أول كتاب سحري!",
    createBook: "إنشاء الكتاب",
    bookTitle: "عنوان الكتاب",
    bookTitlePlaceholder: "مثال: مغامرات الأرنب الصغير",
    description: "الوصف",
    descriptionPlaceholder: "وصف قصير اختياري",
    cover: "الغلاف",
    coverHint: "صورة غلاف الكتاب (اختياري)",
    status: "الحالة",
    draft: "مسودة",
    published: "منشور",
    publish: "نشر",
    unpublish: "إلغاء النشر",
    pages: "الصفحات",
    page: "صفحة",
    addPage: "إضافة صفحة",
    editPage: "تعديل الصفحة",
    pageTitle: "اسم الصفحة / الشخصية",
    pageTitlePlaceholder: "مثال: الأسد الشجاع",
    targetImage: "الصورة المرجعية",
    targetImageHint: "نفس الصورة المطبوعة في الكتاب — الصور الغنية بالتفاصيل والألوان تُتتبَّع أفضل بكثير من الرسومات البسيطة على خلفية سادة",
    model3d: "المجسّم ثلاثي الأبعاد",
    model3dHint: "ملف GLB — يُفضَّل أن يحتوي أنيميشن",
    audio: "الصوت",
    audioHint: "صوت يُشغَّل عند ظهور الشخصية (اختياري)",
    audioLoop: "تكرار الصوت",
    animationClip: "حركة الأنيميشن",
    firstClip: "الأولى تلقائياً",
    noAnimations: "لا يحتوي هذا الملف على أنيميشن — سنضيف حركة طفو لطيفة تلقائياً",
    modelScale: "حجم المجسّم",
    modelHeight: "الارتفاع فوق الصفحة",
    modelRotation: "زاوية الدوران",
    save: "حفظ",
    saving: "جاري الحفظ…",
    cancel: "إلغاء",
    delete: "حذف",
    deleteBookConfirm: "حذف هذا الكتاب وكل صفحاته نهائياً؟",
    deletePageConfirm: "حذف هذه الصفحة؟",
    uploading: "جاري الرفع…",
    dropOrClick: "اسحب الملف هنا أو اضغط للاختيار",
    replaceFile: "استبدال الملف",
    compile: "تجهيز الكتاب للمسح",
    compiling: "جاري تجهيز الصفحات…",
    compilingPage: "معالجة الصورة",
    compileNeeded: "يحتاج إعادة تجهيز",
    compileDone: "الكتاب جاهز للمسح",
    compileFailed: "فشل التجهيز",
    compileHint: "بعد إضافة أو تغيير الصفحات، اضغط «تجهيز الكتاب» لبناء ملف التعرف على الصور",
    tooManyPages: "أكثر من {n} صفحة قد يبطئ التعرف — الأفضل تقسيم الكتاب",
    qrTitle: "رمز الكتاب",
    qrHint: "اطبع هذا الرمز على غلاف الكتاب — الطفل يمسحه مرة واحدة فقط",
    downloadPng: "تنزيل PNG",
    downloadSvg: "تنزيل SVG",
    copyLink: "نسخ الرابط",
    linkCopied: "تم نسخ الرابط!",
    analytics: "الإحصائيات",
    totalViews: "إجمالي المشاهدات",
    lastViewed: "آخر مشاهدة",
    byDevice: "حسب الجهاز",
    byOs: "حسب النظام",
    noViewsYet: "لا مشاهدات بعد",
    back: "رجوع",
    loading: "جاري التحميل…",
    error: "حدث خطأ",
    retry: "إعادة المحاولة",
    // Child viewer
    startAdventure: "ابدأ المغامرة!",
    pointCamera: "وجّه الكاميرا على صورة في الكتاب 📖",
    lookingFor: "أبحث عن الصور…",
    foundIt: "وجدتها! 🎉",
    loadingCharacter: "جاري إحضار الشخصية…",
    explore: "قرّب الشخصية",
    backToBook: "ارجع للكتاب",
    exploreHint: "اسحب للتدوير • قرّب إصبعيك للتكبير",
    cameraDenied: "نحتاج إذن الكاميرا لنرى الكتاب! افتح إعدادات المتصفح واسمح بالكاميرا",
    inAppBrowser: "افتح الرابط في متصفح Safari أو Chrome — الكاميرا لا تعمل داخل هذا التطبيق",
    openInBrowser: "انسخ الرابط وافتحه في المتصفح",
    bookNotFound: "لم نجد هذا الكتاب",
    bookNotReady: "هذا الكتاب غير جاهز بعد — اطلب من الناشر تجهيزه",
    desktopHint: "افتح هذا الرابط على جوالك لتعيش المغامرة! امسح الرمز:",
    mute: "كتم الصوت",
    unmute: "تشغيل الصوت",
    language: "English",
  },
  en: {
    appName: "My Living Book",
    tagline: "Bring children's book pictures to life",
    dashboard: "Dashboard",
    myBooks: "My books",
    newBook: "New book",
    noBooksYet: "No books yet — create your first magical book!",
    createBook: "Create book",
    bookTitle: "Book title",
    bookTitlePlaceholder: "e.g. The Little Rabbit's Adventures",
    description: "Description",
    descriptionPlaceholder: "Optional short description",
    cover: "Cover",
    coverHint: "Book cover image (optional)",
    status: "Status",
    draft: "Draft",
    published: "Published",
    publish: "Publish",
    unpublish: "Unpublish",
    pages: "Pages",
    page: "Page",
    addPage: "Add page",
    editPage: "Edit page",
    pageTitle: "Page / character name",
    pageTitlePlaceholder: "e.g. The Brave Lion",
    targetImage: "Reference image",
    targetImageHint: "The exact picture printed in the book — detailed, colorful images track far better than simple art on plain backgrounds",
    model3d: "3D model",
    model3dHint: "GLB file — ideally with animation",
    audio: "Sound",
    audioHint: "Played when the character appears (optional)",
    audioLoop: "Loop sound",
    animationClip: "Animation clip",
    firstClip: "First (automatic)",
    noAnimations: "This file has no animations — we'll add a gentle floating motion automatically",
    modelScale: "Model size",
    modelHeight: "Height above page",
    modelRotation: "Rotation",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    delete: "Delete",
    deleteBookConfirm: "Delete this book and all its pages permanently?",
    deletePageConfirm: "Delete this page?",
    uploading: "Uploading…",
    dropOrClick: "Drop a file here or click to choose",
    replaceFile: "Replace file",
    compile: "Prepare book for scanning",
    compiling: "Preparing pages…",
    compilingPage: "Processing image",
    compileNeeded: "Needs re-preparing",
    compileDone: "Book is ready to scan",
    compileFailed: "Preparation failed",
    compileHint: "After adding or changing pages, press “Prepare book” to build the image recognition file",
    tooManyPages: "More than {n} pages can slow recognition — consider splitting the book",
    qrTitle: "Book code",
    qrHint: "Print this code on the book cover — the child scans it just once",
    downloadPng: "Download PNG",
    downloadSvg: "Download SVG",
    copyLink: "Copy link",
    linkCopied: "Link copied!",
    analytics: "Analytics",
    totalViews: "Total views",
    lastViewed: "Last viewed",
    byDevice: "By device",
    byOs: "By OS",
    noViewsYet: "No views yet",
    back: "Back",
    loading: "Loading…",
    error: "Something went wrong",
    retry: "Retry",
    // Child viewer
    startAdventure: "Start the adventure!",
    pointCamera: "Point the camera at a picture in the book 📖",
    lookingFor: "Looking for pictures…",
    foundIt: "Found it! 🎉",
    loadingCharacter: "Fetching the character…",
    explore: "Bring it closer",
    backToBook: "Back to the book",
    exploreHint: "Drag to rotate • pinch to zoom",
    cameraDenied: "We need camera permission to see the book! Allow the camera in your browser settings",
    inAppBrowser: "Open this link in Safari or Chrome — the camera doesn't work inside this app",
    openInBrowser: "Copy the link and open it in your browser",
    bookNotFound: "We couldn't find this book",
    bookNotReady: "This book isn't ready yet — ask the publisher to prepare it",
    desktopHint: "Open this link on your phone to live the adventure! Scan the code:",
    mute: "Mute",
    unmute: "Unmute",
    language: "العربية",
  },
} as const;

export type TKey = keyof (typeof dict)["ar"];

interface I18nValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (lang: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    // Re-applying the persisted language after hydration is intentional here:
    // reading localStorage during render would break SSR/hydration.
    const saved = window.localStorage.getItem("lang");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "en" || saved === "ar") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("lang", l);
  };

  const t: I18nValue["t"] = (key, vars) => {
    let text: string = dict[lang][key] ?? dict.en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, String(v));
    }
    return text;
  };

  return (
    <I18nContext.Provider value={{ lang, dir: lang === "ar" ? "rtl" : "ltr", setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
