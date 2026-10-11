# hungngduy.github.io

Personal academic website of Hung D. Nguyen — built with Jekyll + Tailwind CSS and deployed by GitHub Actions.

## How to update

| What | File |
|---|---|
| Name, email, CV / Scholar / ResearchGate links, photo file name | `_config.yml` |
| Vietnamese name, bio, office, LinkedIn | `_data/profile.yml` |
| News (add new items at the top) | `_data/news.yml` |
| Academic service (reviewer list) | `_data/service.yml` |
| Publications (paste BibTeX) | `bib/papers.bib` |
| Profile photo (4:5) | `images/portrait.jpg` |
| Blog posts (optional; "Blog" appears in the menu once a post exists) | `_posts/YYYY-MM-DD-title.md` |

Publications are rendered in the browser by `assets/js/publications.js`: IEEE-like style,
newest first, auto-numbered [J#]/[C#]; your name (`me_*` in `_config.yml`) is shown in bold.

## Structure

```
_config.yml              site settings
_data/                   profile, news, service
_includes/, _layouts/    page building blocks (header, footer, head, page layouts)
_tailwind.css            styles (Tailwind + custom CSS)
index.html               home page
publications.html        publications page
blog.html, _posts/       blog (optional)
bib/papers.bib           BibTeX source for publications
assets/js/publications.js  BibTeX -> publication list
.github/workflows/       build & deploy (GitHub Actions)
```

**GitHub Pages setting:** Settings → Pages → Source = **GitHub Actions**.

## Credits
Template adapted from [keunhong.github.io](https://github.com/keunhong/keunhong.github.io)
(<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>).
