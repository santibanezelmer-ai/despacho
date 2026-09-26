# Architecture rules

- Synchronize the dispatch theme through `useScreenTheme` for the page, app shell, and dispatch dialog; each has a separate DOM root, and the sidebar must share the console's chosen palette.
- Render the finalization dialog in a body portal above operational cards and keep its personnel pickers above the dialog overlay; card stacking contexts must not obscure closure confirmation.