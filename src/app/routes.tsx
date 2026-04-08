import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout";
import { HomePage } from "./components/home-page";
import { ModelCatalog } from "./components/model-catalog";
import { ApplyPage } from "./components/apply-page";
import { AdminPage } from "./components/admin-page";
import { CodeExamples } from "./components/code-examples";
import { NotificationsPage } from "./components/notifications-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "models", Component: ModelCatalog },
      { path: "apply", Component: ApplyPage },
      { path: "admin", Component: AdminPage },
      { path: "examples", Component: CodeExamples },
      { path: "notifications", Component: NotificationsPage },
    ],
  },
]);
