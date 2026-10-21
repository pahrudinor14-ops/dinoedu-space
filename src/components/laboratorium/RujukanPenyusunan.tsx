type Material = "bilangan" | "pecahan" | "geometri" | "bangun-ruang" | "data"

const references: Record<Material, { title: string; href: string }[]> = {
  bilangan: [
    { title: "Panduan Mata Pelajaran Matematika Fase A–F Kemendikdasmen (2025)", href: "https://repositori.kemendikdasmen.go.id/33608/" },
    { title: "Buku Panduan Guru Matematika SD/MI Kelas IV (2022)", href: "https://repositori.kemendikdasmen.go.id/35851/" },
    { title: "Matematika untuk SD/MI Kelas IV (2022)", href: "https://repositori.kemendikdasmen.go.id/35863/" },
    { title: "Matematika untuk SMP/MTs Kelas VII (2022)", href: "https://repositori.kemendikdasmen.go.id/35884/" },
    { title: "BERMUTU — Kapita Selekta Pembelajaran Bilangan SMP", href: "https://repositori.kemendikdasmen.go.id/7992/" },
    { title: "IES — Assisting Students Struggling with Mathematics (2021)", href: "https://ies.ed.gov/ncee/wwc/practiceguide/26" },
  ],
  pecahan: [
    { title: "Panduan Mata Pelajaran Matematika Kemendikdasmen (2025)", href: "https://repositori.kemendikdasmen.go.id/33608/" },
    { title: "Matematika SD/MI Kelas IV — Pusat Perbukuan (2022)", href: "https://repositori.kemendikdasmen.go.id/35863/" },
    { title: "IES — Developing Effective Fractions Instruction K–8", href: "https://ies.ed.gov/ncee/wwc/practiceguide/15" },
    { title: "NIST — SI Learning Hub", href: "https://www.nist.gov/pml/owm/si-learning-hub" },
    { title: "BIPM — The International System of Units (SI Brochure)", href: "https://www.bipm.org/en/publications/si-brochure" },
    { title: "NIST — SI Units: Temperature", href: "https://www.nist.gov/pml/owm/si-units-temperature" },
    { title: "NIST — Guide to the SI: Conversion Factors", href: "https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9" },
  ],
  geometri: [
    { title: "Panduan Mata Pelajaran Matematika Kemendikdasmen (2025)", href: "https://repositori.kemendikdasmen.go.id/33608/" },
    { title: "Matematika SD/MI Kelas IV — Bangun Datar dan Pengukuran (2022)", href: "https://repositori.kemendikdasmen.go.id/35863/" },
    { title: "Modul Geometri Datar Kelas VII SMP — BERMUTU", href: "https://repositori.kemendikdasmen.go.id/8044/" },
  ],
  "bangun-ruang": [
    { title: "Panduan Mata Pelajaran Matematika Kemendikdasmen (2025)", href: "https://repositori.kemendikdasmen.go.id/33608/" },
    { title: "Kapita Selekta Geometri Ruang di SMP — BERMUTU", href: "https://repositori.kemendikdasmen.go.id/8028/" },
    { title: "Matematika SD/MI Kelas IV — Pengukuran Luas dan Volume (2022)", href: "https://repositori.kemendikdasmen.go.id/35863/" },
  ],
  data: [
    { title: "Panduan Mata Pelajaran Matematika Fase A–F — Kemendikdasmen (2025)", href: "https://repositori.kemendikdasmen.go.id/33608/" },
    { title: "Buku Panduan Guru Matematika SD/MI Kelas IV — Pola, Piktogram, dan Diagram Batang (2022)", href: "https://repositori.kemendikdasmen.go.id/35851/" },
    { title: "Matematika untuk SD/MI Kelas IV — Pusat Perbukuan (2022)", href: "https://repositori.kemendikdasmen.go.id/35863/" },
    { title: "Buku Panduan Guru Matematika SMP/MTs Kelas VII — Data dan Diagram (2022)", href: "https://repositori.kemendikdasmen.go.id/35882/" },
    { title: "Matematika untuk SMP/MTs Kelas VII — Data dan Diagram (2022)", href: "https://repositori.kemendikdasmen.go.id/35884/" },
    { title: "IES — Assisting Students Struggling with Mathematics (2021)", href: "https://ies.ed.gov/ncee/wwc/practiceguide/26" },
  ],
}

export default function RujukanPenyusunan({ material }: { material: Material }) {
  return (
    <footer className="rounded-2xl border border-border/60 bg-background/60 p-4 text-xs leading-5 text-muted-foreground">
      <p className="font-semibold text-foreground">Rujukan penyusunan</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {references[material].map((reference) => (
          <li key={reference.href}>
            <a href={reference.href} target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-4 hover:text-foreground">{reference.title}</a>
          </li>
        ))}
      </ul>
    </footer>
  )
}
