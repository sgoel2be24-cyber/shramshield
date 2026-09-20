/**
 * "Why this exists" — the cited impact case, on the page itself.
 *
 * A judge who never opens the repo should still see that the problem is documented, with
 * sources. Every number here is cited in the README as well; if a figure changes, change both.
 */
export function ImpactStrip() {
  return (
    <section className="panel impact" aria-labelledby="impact-heading">
      <h2 id="impact-heading">Why this exists</h2>
      <div className="impact-grid">
        <figure className="impact-figure">
          <blockquote>
            <p>84</p>
            <figcaption>
              heatstroke deaths recorded in India, Feb&ndash;Jul 2025 (news-based analysis). Most victims:
              elderly people, outdoor workers, daily-wage labourers.
            </figcaption>
          </blockquote>
          <blockquote>
            <p>7,192 / 14</p>
            <figcaption>
              suspected heatstroke cases vs confirmed deaths (NCDC, via RTI, Mar&ndash;Jun 2025) &mdash; the
              toll is undercounted.
            </figcaption>
          </blockquote>
          <blockquote>
            <p>90%+</p>
            <figcaption>
              of India&rsquo;s workforce is informal &mdash; working peak sun with no mandatory breaks, shade
              or cooling access.
            </figcaption>
          </blockquote>
        </figure>
        <div className="impact-text">
          <p>
            Official heat alerts are built on air temperature alone. The metric that predicts heat strain
            &mdash; WBGT &mdash; also includes humidity and solar load, and it is the one India&rsquo;s
            warnings do not use. Deaths have been documented on days when no alert was issued.
          </p>
          <p className="muted">
            Sources: HeatWatch, <em>Struck by Heat</em> (2025) &middot; The Hindu (22 Aug 2025) &middot; NCDC
            figures via RTI/PTI &middot; a plea on worker heat protection is pending before the Supreme Court
            (LiveLaw, Jul 2026). HeatWatch&rsquo;s own recommendation: adopt WBGT-based alerts and enforceable
            work&ndash;rest cycles &mdash; exactly what this tool computes.
          </p>
        </div>
      </div>
    </section>
  );
}
