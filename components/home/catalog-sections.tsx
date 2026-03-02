import Link from 'next/link';
import { homeCatalogSections } from 'data/home-catalogs';

export default function CatalogSections() {
  return (
    <section className="container-wrapper px-4 lg:px-0 space-y-6 pt-2">
      <div className="space-y-2">
        <h2 className="text-xl md:text-2xl font-semibold">Browse catalog categories</h2>
        <p className="text-sm text-gray-400">Movie, series and anime catalogs organized with TMDB and Kitsu sources.</p>
      </div>

      <div className="space-y-6">
        {homeCatalogSections.map((section) => (
          <div key={section.title} className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold">{section.title}</h3>
              <p className="text-xs text-gray-400">{section.description}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="tv-card rounded-[1.2rem] border border-gray-800 bg-gradient-to-b from-gray-900 to-black p-4 hover:border-custome-red transition-colors"
                >
                  <p className="text-sm font-medium leading-snug min-h-[2.5rem]">{item.name}</p>
                  <span
                    className={`inline-block mt-2 text-[11px] px-2 py-0.5 rounded-full ${
                      item.source === 'Kitsu' ? 'bg-purple-700/30 text-purple-300' : 'bg-blue-700/30 text-blue-300'
                    }`}
                  >
                    {item.source}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
