import { useSiteData } from '../../context/SiteDataContext';
import { translations } from '../../i18n/translations';

export default function AboutPage() {
  const { settings, language, team } = useSiteData();
  const t = translations[language].about;

  const stats = [
    { num: '1+', label: 'Years in Business' },
    { num: '53+', label: 'Projects Completed' },
    { num: '10+', label: 'Expert Technicians' },
    { num: '24/7', label: 'Support Available' },
  ];

  return (
    <main className="pt-24 min-h-screen">
      {/* Header */}
      <section className="relative py-24 bg-gray-900 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: `url('https://readdy.ai/api/search-image?query=professional%20security%20company%20team%20working%20in%20modern%20office%2C%20corporate%20environment%2C%20team%20collaboration%2C%20technology%20background%2C%20Kenya%20Africa&width=1920&height=600&seq=abouthdr&orientation=landscape')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 to-gray-900" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <span className="text-orange-400 font-semibold text-sm tracking-widest uppercase">Who We Are</span>
          <h1 className="text-5xl font-black text-white mt-3 mb-4">{t.title}</h1>
          <p className="text-gray-400 text-xl max-w-xl mx-auto">{t.subtitle}</p>
        </div>
      </section>

      {/* About Text */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-orange-600 font-semibold text-sm tracking-widest uppercase">Our Story</span>
              <h2 className="text-4xl font-black text-gray-900 mt-3 mb-6">Built on Trust, Delivered with Excellence</h2>
              <p className="text-gray-600 leading-relaxed mb-6 text-base">{settings.aboutText}</p>
              <p className="text-gray-600 leading-relaxed text-base">
                From our headquarters in Nairobi, we serve clients across Kenya providing end-to-end security and technology solutions. Every project, large or small, receives the same level of attention, expertise, and commitment to quality.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-5">
                {stats.map((stat) => (
                  <div key={stat.label} className="bg-orange-50 rounded-xl p-5 text-center">
                    <p className="text-3xl font-black text-orange-600">{stat.num}</p>
                    <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden h-96">
              <img
                src="https://readdy.ai/api/search-image?query=professional%20security%20company%20team%20meeting%20in%20modern%20Nairobi%20Kenya%20office%2C%20diverse%20African%20professionals%2C%20corporate%20environment%2C%20technology%20screens%20in%20background%2C%20warm%20professional%20lighting&width=700&height=500&seq=aboutimg&orientation=landscape"
                alt="PRIMECREST Team"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: 'ri-rocket-line', title: t.mission_title, text: t.mission },
              { icon: 'ri-eye-line', title: t.vision_title, text: t.vision },
              { icon: 'ri-shield-star-line', title: t.values_title, text: null, values: t.values },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-8 border border-gray-100">
                <div className="w-14 h-14 flex items-center justify-center bg-orange-100 rounded-xl mb-5">
                  <i className={`${item.icon} text-orange-600 text-2xl`} />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-4">{item.title}</h3>
                {item.text && <p className="text-gray-600 text-sm leading-relaxed">{item.text}</p>}
                {item.values && (
                  <ul className="space-y-2">
                    {item.values.map((v) => (
                      <li key={v} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-5 h-5 flex items-center justify-center text-orange-500 flex-shrink-0">
                          <i className="ri-checkbox-circle-fill" />
                        </span>
                        {v}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-orange-600 font-semibold text-sm tracking-widest uppercase">Our Team</span>
            <h2 className="text-4xl font-black text-gray-900 mt-3">Meet the Experts</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member) => (
              <div key={member.id} className="group text-center">
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-4 border-4 border-orange-100 group-hover:border-orange-400 transition-colors bg-gray-100 flex items-center justify-center">
                  {member.imageUrl ? (
                    <img
                      src={member.imageUrl}
                      alt={member.name}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <i className="ri-user-line text-4xl" />
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 text-base">{member.name}</h3>
                <p className="text-sm text-orange-600">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}