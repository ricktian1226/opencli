/**
 * Injected script for detecting frontend frameworks (Vue, React, Next, Nuxt, etc.)
 */
export function detectFramework() {
    const r = {};
    try {
        const app = document.querySelector('#app');
        r.vue3 = !!(app && app.__vue_app__);
        r.vue2 = !!(app && app.__vue__);
        r.react = !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || !!document.querySelector('[data-reactroot]');
        r.nextjs = !!window.__NEXT_DATA__;
        r.nuxt = !!window.__NUXT__;
        if (r.vue3 && app.__vue_app__) {
            const gp = app.__vue_app__.config?.globalProperties;
            r.pinia = !!(gp && gp.$pinia);
            r.vuex = !!(gp && gp.$store);
        }
    }
    catch { }
    return r;
}
