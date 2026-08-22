import { ArrowRight, Boxes, Clock3 } from 'lucide-react';

import type { productModules } from '@/src/lib/navigation';

interface ModulePlaceholderProps {
  module: (typeof productModules)[keyof typeof productModules];
}

export function ModulePlaceholder({ module }: ModulePlaceholderProps) {
  return (
    <div className="dashboard-page">
      <header className="page-heading">
        <div>
          <span className="page-eyebrow">{module.eyebrow}</span>
          <h1>{module.label}</h1>
          <p>{module.description}</p>
        </div>
        <button className="button button--primary" type="button" disabled>
          {module.action} <ArrowRight size={16} />
        </button>
      </header>

      <section className="module-empty panel">
        <div className="module-empty__icon">
          <Boxes size={27} />
        </div>
        <span className="planned-badge">
          <Clock3 size={14} /> Planejado para Sprint {module.sprint}
        </span>
        <h2>{module.emptyTitle}</h2>
        <p>{module.emptyDescription}</p>
      </section>
    </div>
  );
}
