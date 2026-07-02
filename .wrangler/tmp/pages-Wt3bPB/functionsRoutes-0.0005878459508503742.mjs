import { onRequestPost as __api_contact_js_onRequestPost } from "D:\\My Work\\MOS Logix\\MOS Logix (Systems)\\MOS Renix\\Landing - intro\\renix-landing\\functions\\api\\contact.js"
import { onRequestPost as __api_demo_js_onRequestPost } from "D:\\My Work\\MOS Logix\\MOS Logix (Systems)\\MOS Renix\\Landing - intro\\renix-landing\\functions\\api\\demo.js"
import { onRequest as __api_contact_js_onRequest } from "D:\\My Work\\MOS Logix\\MOS Logix (Systems)\\MOS Renix\\Landing - intro\\renix-landing\\functions\\api\\contact.js"
import { onRequest as __api_demo_js_onRequest } from "D:\\My Work\\MOS Logix\\MOS Logix (Systems)\\MOS Renix\\Landing - intro\\renix-landing\\functions\\api\\demo.js"

export const routes = [
    {
      routePath: "/api/contact",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_contact_js_onRequestPost],
    },
  {
      routePath: "/api/demo",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_demo_js_onRequestPost],
    },
  {
      routePath: "/api/contact",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_contact_js_onRequest],
    },
  {
      routePath: "/api/demo",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_demo_js_onRequest],
    },
  ]