
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Newsletter {
  id: string;
  title: string;
  academicYear: string;
  weekNumber: number;
  publicationDate: string;
  description?: string;
}

export default function NewslettersPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [expandedYears, setExpandedYears] = useState<string[]>([]);

  useEffect(() => {
    const loadNewsletters = async () => {
      try {
        const response = await fetch('/api/newsletters');

        if (!response.ok) {
          throw new Error('Failed to load newsletters');
        }

        const data = await response.json();
        const loadedNewsletters: Newsletter[] = data.newsletters || [];

        setNewsletters(loadedNewsletters);

        // Expand the latest academic year automatically
        if (loadedNewsletters.length > 0) {
          setExpandedYears([loadedNewsletters[0].academicYear]);
        }
      } catch (err) {
        console.error('Newsletter loading error:', err);
        setError('Unable to load newsletters. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadNewsletters();
  }, []);

  const groupedNewsletters = newsletters.reduce(
    (groups, newsletter) => {
      if (!groups[newsletter.academicYear]) {
        groups[newsletter.academicYear] = [];
      }

      groups[newsletter.academicYear].push(newsletter);
      return groups;
    },
    {} as Record<string, Newsletter[]>
  );

  const academicYears = Object.keys(groupedNewsletters).sort(
    (a, b) => {
      const yearA = Number(a.split('/')[0]);
      const yearB = Number(b.split('/')[0]);
      return yearB - yearA;
    }
  );

  const toggleYear = (year: string) => {
    setExpandedYears((current) =>
      current.includes(year)
        ? current.filter((item) => item !== year)
        : [...current, year]
    );
  };

  return (
    <main className="min-h-screen bg-[#102d3b] text-white">
      <div className="max-w-5xl mx-auto px-4 py-16">

        {/* Page heading */}
        <div className="mb-12">
          <p className="text-blue-300 uppercase tracking-widest text-sm font-semibold mb-3">
            USIC Sheffield
          </p>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Newsletter Archive
          </h1>

          <p className="text-gray-300 text-lg max-w-2xl">
            Stay connected with USIC. Explore our weekly newsletters,
            announcements, reflections and updates from across the
            academic year.
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-16 text-gray-300">
            Loading newsletters...
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-6 text-red-300">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && newsletters.length === 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
            <h2 className="text-xl font-semibold mb-2">
              No newsletters yet
            </h2>
            <p className="text-gray-400">
              Our newsletter editions will appear here once published.
            </p>
          </div>
        )}

        {/* Academic years */}
        {!isLoading && !error && academicYears.length > 0 && (
          <div className="space-y-5">
            {academicYears.map((year) => {
              const isExpanded = expandedYears.includes(year);
              const yearNewsletters = groupedNewsletters[year].sort(
                (a, b) => b.weekNumber - a.weekNumber
              );

              return (
                <section
                  key={year}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                  >
                    <div>
                      <h2 className="text-xl md:text-2xl font-semibold">
                        Academic Year {year}
                      </h2>
                      <p className="text-gray-400 text-sm mt-1">
                        {yearNewsletters.length}{' '}
                        {yearNewsletters.length === 1 ? 'edition' : 'editions'}
                      </p>
                    </div>

                    <span className="text-2xl text-blue-300">
                      {isExpanded ? '−' : '+'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-white/10 divide-y divide-white/10">
                      {yearNewsletters.map((newsletter) => (
                        <Link
                          key={newsletter.id}
                          href={`/newsletters/${newsletter.id}`}
                          className="block p-5 md:px-6 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1">
                                Week {newsletter.weekNumber}
                              </p>

                              <h3 className="font-semibold text-lg">
                                {newsletter.title}
                              </h3>

                              {newsletter.description && (
                                <p className="text-gray-400 text-sm mt-1">
                                  {newsletter.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-4">
                              <span className="text-gray-400 text-sm">
                                {new Date(
                                  `${newsletter.publicationDate}T00:00:00`
                                ).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>

                              <span className="text-blue-300 text-xl">
                                →
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
