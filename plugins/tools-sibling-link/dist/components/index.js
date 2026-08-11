import { jsx, jsxs } from "preact/jsx-runtime"

const ToolsSiblingLinkComponent = ({ displayClass }) =>
  jsxs("a", {
    class: `${displayClass ?? ""} tools-sibling-link`,
    href: "https://tools.matthewgarner.me",
    children: [
      jsx("span", { class: "tools-sibling-kicker", children: "OTHER WORK" }),
      jsx("span", { children: "Tools" }),
      jsx("span", { class: "tools-sibling-arrow", "aria-hidden": "true", children: "↗" }),
    ],
  })

export const ToolsSiblingLink = () => ToolsSiblingLinkComponent
