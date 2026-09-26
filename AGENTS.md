# Architecture rules

- Synchronize the dispatch theme through `useScreenTheme` for the page, app shell, and dispatch dialog; each has a separate DOM root, and the sidebar must share the console's chosen palette.