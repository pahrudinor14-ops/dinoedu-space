interface DinoLabLogoProps {
  className?: string
}

export default function DinoLabLogo({ className }: DinoLabLogoProps) {
  return <img src="/dinolab.PNG" alt="Logo DinoLab" className={className} />
}
