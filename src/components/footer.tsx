
import Link from 'next/link';
import { Github, Linkedin, Twitter, Mail } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Waves } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/40 bg-background/90 backdrop-blur-sm">
      <div className="w-full py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="flex flex-col items-start">
            <Link href="/" className="flex items-center space-x-2 mb-3">
              <Waves className="h-8 w-8 text-primary" />
              <span className="font-bold font-headline text-2xl text-foreground">
                GrafosMap
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Mapas em grafos.
            </p>
          </div>

          
          <div>
            <h3 className="text-md font-semibold text-foreground mb-3">Navegação</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Início</Link></li>
              <li><Link href="/#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">Funcionalidades</Link></li>
              <li><Link href="/#contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contato</Link></li>
            </ul>
          </div>

          
          <div>
            <h3 className="text-md font-semibold text-foreground mb-3">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Termos de Serviço</Link></li>
              <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Política de Privacidade</Link></li>
            </ul>
          </div>

          
          <div>
            <h3 className="text-md font-semibold text-foreground mb-3">Conecte-se</h3>
            <div className="flex space-x-3 mb-4">
              <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-primary">
                <Link href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                  <Github className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-primary">
                <Link href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <Linkedin className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-primary">
                <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                  <Twitter className="h-5 w-5" />
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              <Mail className="inline h-4 w-4 mr-1" /> contato@grafosmap.com
            </p>
          </div>
        </div>

        <Separator className="my-8 bg-border/50" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            &copy; {currentYear} GrafosMap. Todos os direitos reservados.
          </p>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
