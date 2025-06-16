
import { Button } from '@/components/ui/button';
import { MapPin, FileUp, FileText } from 'lucide-react';
import Link from 'next/link';

const NeonButton = ({ children, icon: Icon, href, ...props }: { children: React.ReactNode, icon: React.ElementType, href?: string, [key: string]: any }) => {
  const commonProps = {
    variant: "outline",
    size: "lg",
    className: "w-full md:w-auto text-lg py-16 px-8 font-headline border-2 border-accent text-accent shadow-[0_0_8px_theme(colors.accent)] hover:bg-accent hover:text-accent-foreground hover:shadow-[0_0_15px_theme(colors.accent)] transition-all duration-300 ease-in-out transform hover:scale-105 group",
    ...props
  };

  if (href) {
    return (
      <Link href={href} passHref legacyBehavior>
        <Button asChild {...commonProps}>
          <a>
            <Icon className="mr-3 h-6 w-6 transition-transform duration-300 group-hover:rotate-[15deg]" />
            {children}
          </a>
        </Button>
      </Link>
    );
  }

  return (
    <Button {...commonProps}>
      <Icon className="mr-3 h-6 w-6 transition-transform duration-300 group-hover:rotate-[15deg]" />
      {children}
    </Button>
  );
};


export function ActionButtonsGroup() {
  return (
    <div className="flex flex-col items-center space-y-6 md:flex-row md:space-y-0 md:space-x-6">
      <NeonButton icon={MapPin}>
        Buscar no Google Maps
      </NeonButton>
      <NeonButton icon={FileUp} href="/dijkstra-map">
        Importar Arquivo de Mapa
      </NeonButton>
      <NeonButton icon={FileText}>
        Importar Arquivo TXT
      </NeonButton>
    </div>
  );
}
