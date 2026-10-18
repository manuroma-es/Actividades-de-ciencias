# External activities in THE EARTH

The editable catalog workbook records eight additional resources in Biología y Geología / THE EARTH. Their original public links and provider embed URLs come from the activity list supplied for this change. All ten activities in the topic, including the two existing native activities, are recorded as created in 1.º ESO, as confirmed by the user.

The detail page embeds an activity when its source has a provider-approved HTTPS `embedUrl`. The activity card links to that detail page and also keeps a direct provider link. Every embedded page repeats that fallback because browsers cannot reliably report a cross-origin frame refusal to the parent page.

Educaplay and Wordwall use the exact embed URLs supplied with the activity list. The three Lumi export files were inspected: each contains H5P content data, but its core and content-library scripts and styles are referenced as root-relative `/core/...` and `/libraries/...` paths. Those libraries are not included in the HTML file, so copying the HTML into this static site would leave the player dependencies missing. The Lumi activities therefore embed their supplied `app.lumi.education/run/...` pages, with the same URL retained as the direct-link fallback. The export HTML files are not copied into the repository.

The catalog uses an optional `URL de inserción` workbook field. Catalog validation permits only HTTPS embed URLs on the host listed for that activity's platform. Lumi links are marked unverified because the supplied run pages were not tested in a browser during implementation.
