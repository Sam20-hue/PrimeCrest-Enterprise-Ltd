import { Link } from 'react-router-dom';
import { useSiteData } from '../../../context/SiteDataContext';

export default function CtaBanner() {
  const { settings } = useSiteData();

  return (
    <section className="py-0">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[280px]">
        {/* Left - Orange */}
        <div className="bg-orange-600 flex flex-col items-center justify-center text-center px-12 py-16">
          <h3 className="text-3xl font-black text-white mb-3">Ready to Secure Your Business?</h3>
          <p className="text-orange-100 mb-8 max-w-sm leading-relaxed">
            Schedule a free site assessment with our security experts. No obligation.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-orange-700 font-bold rounded-lg hover:bg-orange-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-phone-line" />
            </span>
            Contact Us Today
          </Link>
        </div>

        {/* Right - Dark */}
        <div className="bg-gray-900 flex flex-col items-center justify-center px-12 py-16">
          <div className="grid grid-cols-2 gap-8 text-center">
            {[
              { icon: 'ri-phone-fill', label: 'Call Us', value: settings.phone },
              { icon: 'ri-mail-fill', label: 'Email Us', value: settings.email },
              { icon: 'ri-map-pin-fill', label: 'Visit Us', value: settings.address },
              { icon: 'ri-time-fill', label: 'Open Hours', value: 'Mon–Fri 8AM–6PM' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 flex items-center justify-center bg-orange-600/20 rounded-full">
                  <i className={`${item.icon} text-orange-400 text-lg`} />
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
                <p className="text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}