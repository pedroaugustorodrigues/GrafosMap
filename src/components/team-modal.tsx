
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

const teamMembers = [
  { name: "Omar AL Jawabri", role: "Desenvolvedor Full-Stack", initials: "OJ", avatarHint: "woman leader" },
  { name: "Stephano Viglio", role: "Desenvolvedor Full-Stack", initials: "SV", avatarHint: "man software" },
  { name: "Hugo Borges", role: "Desenvolvedor Full-Stack", initials: "HB", avatarHint: "man code" },
  { name: "Pedro Augusto", role: "Desenvolvedor Full-Stack", initials: "PA", avatarHint: "woman tech" },
  { name: "Rodrigo Luiz", role: "Desenvolvedor Full-Stack", initials: "RL", avatarHint: "man computer" },
  { name: "Vinicius Espindola", role: "Desenvolvedor Full-Stack", initials: "VE", avatarHint: "man computer" },
];

export default function TeamModal() {
  return (
    <DialogContent className="sm:max-w-[525px] bg-card text-card-foreground">
      <DialogHeader>
        <DialogTitle className="text-2xl font-headline">Nossa Equipe</DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 py-4">
        {teamMembers.map((member) => (
          <div key={member.name} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <Avatar className="h-12 w-12 border-2 border-primary">
              <AvatarImage src={`https://placehold.co/100x100.png?text=${member.initials}`} alt={member.name} data-ai-hint={member.avatarHint} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {member.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-md font-semibold text-foreground">{member.name}</p>
              <p className="text-sm text-muted-foreground">{member.role}</p>
            </div>
          </div>
        ))}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" className="hover:bg-accent hover:text-accent-foreground">
            Fechar
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
