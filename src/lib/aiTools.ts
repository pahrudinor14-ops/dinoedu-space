import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Layers3,
  Mail,
  MessageCircle,
} from "lucide-react";
export const AI_TOOLS = [
  {
    id: "dinoai",
    title: "DinoAI Chat",
    description:
      "Teman AI untuk mencari ide, memahami materi, dan membantu menyelesaikan berbagai kebutuhan.",
    icon: MessageCircle,
  },
  {
    id: "cv",
    title: "AI CV Maker",
    description:
      "Susun CV profesional berdasarkan informasi, pengalaman, dan keterampilan yang kamu miliki.",
    icon: FileText,
  },
  {
    id: "surat",
    title: "AI Surat Lamaran",
    description:
      "Bantu menulis surat lamaran yang rapi dan disesuaikan dengan posisi yang dituju.",
    icon: Mail,
  },
  {
    id: "soal",
    title: "AI Pembuat Soal",
    description:
      "Buat rancangan soal pembelajaran berdasarkan kelas, materi, dan kebutuhan evaluasi.",
    icon: ClipboardList,
  },
  {
    id: "rubrik",
    title: "AI Rubrik Penilaian",
    description:
      "Susun kriteria, deskriptor performa, bobot, dan lembar penskoran yang selaras dengan tujuan belajar.",
    icon: ClipboardCheck,
  },
  {
    id: "evaluasi",
    title: "AI Evaluasi Pembelajaran",
    description:
      "Analisis capaian kelas dari hasil asesmen dan siapkan tindak lanjut pembelajaran.",
    icon: BarChart3,
  },
  {
    id: "modul-ajar",
    title: "AI Modul Ajar",
    description:
      "Bantu menyusun modul ajar secara praktis dan terstruktur untuk mendukung pembelajaran.",
    icon: BookOpen,
  },
  {
    id: "lkpd",
    title: "AI LKPD",
    description:
      "Susun lembar kerja peserta didik yang sesuai tujuan dan materi pembelajaran.",
    icon: ClipboardList,
  },
  {
    id: "ppt-pembelajaran",
    title: "AI PPT Pembelajaran",
    description:
      "Ubah materi pembelajaran menjadi presentasi PowerPoint yang terstruktur.",
    icon: Layers3,
  },
] as const;
export type AIToolId = (typeof AI_TOOLS)[number]["id"];
