import { useMemo, useState } from "react"

import { ArrowLeft, BookOpen, Check, ChevronDown, ChevronUp, FilePlus2, Lightbulb, Sparkles } from "lucide-react"

import { supabase } from "../lib/supabase"



interface AIModulAjarProps { onBack: () => void }



interface ModulAjarResult {

  metadata: {

    judul: string

    jenjang: string

    fase: string

    kelas: string

    mataPelajaran: string

    semester: string

    jumlahPertemuan: number

    durasiPerPertemuan: number

  }

  identifikasi: {

    karakteristikMurid: string

    kesiapanMurid: string

    kebutuhanBelajar: string

  }

  tujuanPembelajaran: {

    capaianPembelajaran?: string

    tujuanPembelajaran: string[]

    indikatorKetercapaian: string[]

  }

  dimensiProfilLulusan: {

    dimensi: string

    alasanRelevansi: string

    buktiPerkembangan: string

  }[]

  desainPembelajaran: {

    praktikPedagogis: string

    konteksPembelajaran: string

    pemanfaatanTeknologi: string

    lingkunganBelajar: string

    kemitraanPembelajaran: string

  }

  pengalamanBelajar: {

    pertemuan: number

    alokasiWaktu: number

    tujuanPertemuan: string

    kegiatanPendahuluan: string[]

    kegiatanInti: string[]

    kegiatanPenutup: string[]

    pengalamanBelajar: {

      memahami: string[]

      mengaplikasi: string[]

      merefleksi: string[]

    }

    diferensiasi: {

      konten: string

      proses: string

      produk: string

    }

  }[]

  asesmen: {

    diagnostik: { teknik: string; instrumen: string }

    formatif: { teknik: string; instrumen: string; kriteria: string }

    sumatif: { teknik: string; instrumen: string; kriteria: string }

  }

  mediaDanSumber: { media: string[]; sumberBelajar: string[] }

  dukunganBelajar: { remedial: string; pengayaan: string; dukunganKhusus: string }

  lampiran: { lkpd?: string; instrumenAsesmen?: string; rubrik?: string; lembarRefleksi?: string; bahanBacaan?: string }

}

type EducationLevel = "PAUD" | "SD/MI" | "SMP/MTs" | "SMA/MA" | "SMK/MAK" | "Kesetaraan" | ""



const phasesByLevel: Record<string,string[]> = { PAUD:["Fondasi"], "SD/MI":["Fase A","Fase B","Fase C"], "SMP/MTs":["Fase D"], "SMA/MA":["Fase E","Fase F"], "SMK/MAK":["Fase E","Fase F"], Kesetaraan:["Fase A","Fase B","Fase C","Fase D","Fase E","Fase F"] }

const gradesByLevel: Record<string,string[]> = { PAUD:["Kelompok A","Kelompok B"], "SD/MI":["Kelas I","Kelas II","Kelas III","Kelas IV","Kelas V","Kelas VI"], "SMP/MTs":["Kelas VII","Kelas VIII","Kelas IX"], "SMA/MA":["Kelas X","Kelas XI","Kelas XII"], "SMK/MAK":["Kelas X","Kelas XI","Kelas XII","Kelas XIII"], Kesetaraan:["Setara SD","Setara SMP","Setara SMA"] }

const subjectsByLevel: Record<string,string[]> = {

  PAUD:["Pembelajaran PAUD Terpadu"],

  "SD/MI":["Bahasa Indonesia","Matematika","IPAS","Pendidikan Pancasila","Pendidikan Agama Islam dan Budi Pekerti","Bahasa Inggris","PJOK","Seni dan Budaya","Informatika","Muatan Lokal"],

  "SMP/MTs":["Bahasa Indonesia","Matematika","IPA","IPS","Pendidikan Pancasila","Pendidikan Agama Islam dan Budi Pekerti","Bahasa Inggris","PJOK","Seni dan Budaya","Informatika","Muatan Lokal"],

  "SMA/MA":["Bahasa Indonesia","Matematika","Bahasa Inggris","Pendidikan Pancasila","Pendidikan Agama Islam dan Budi Pekerti","Fisika","Kimia","Biologi","Ekonomi","Geografi","Sosiologi","Sejarah","Informatika","Seni dan Budaya","PJOK"],

  "SMK/MAK":["Bahasa Indonesia","Matematika","Bahasa Inggris","Pendidikan Pancasila","Pendidikan Agama Islam dan Budi Pekerti","Informatika","Projek Kreatif dan Kewirausahaan","Dasar-Dasar Program Keahlian","Konsentrasi Keahlian"],

  Kesetaraan:["Bahasa Indonesia","Matematika","IPA","IPS","Pendidikan Pancasila","Bahasa Inggris","Keterampilan"]

}

const graduateDimensions=["Keimanan dan ketakwaan terhadap Tuhan Yang Maha Esa","Kewargaan","Penalaran kritis","Kreativitas","Kolaborasi","Kemandirian","Kesehatan","Komunikasi"]

const pedagogicalStrategies=["Berbasis masalah","Berbasis proyek","Inkuiri","Kontekstual","Kolaboratif","Eksploratif","Diferensiasi"]

const contexts=["Kehidupan sehari-hari","Lingkungan sekolah","Lingkungan sekitar","Budaya dan kearifan lokal","Dunia kerja","Isu nyata"]

const inputClass="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[16px] outline-none backdrop-blur-xl transition placeholder:text-muted-foreground/70 focus:border-[#EF629F]/50 dark:bg-white/5"

const selectClass="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[16px] text-foreground outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-[#1D191F]"



function Section({number,title,description,open,onToggle,children}:{number:string;title:string;description:string;open:boolean;onToggle:()=>void;children:React.ReactNode}){return <section className="dino-glass overflow-hidden rounded-[28px]"><button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left sm:px-7"><div className="flex min-w-0 items-center gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EF629F]/10 text-sm font-bold text-[#EF629F]">{number}</span><span className="min-w-0"><span className="block text-base font-bold sm:text-lg">{title}</span><span className="mt-0.5 block text-sm leading-6 text-muted-foreground">{description}</span></span></div>{open?<ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground"/>:<ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground"/>}</button>{open&&<div className="border-t border-border/60 px-6 pb-7 pt-6 sm:px-7">{children}</div>}</section>}

function FieldLabel({children,optional=false}:{children:React.ReactNode;optional?:boolean}){return <label className="mb-2 block text-sm font-semibold">{children}{optional&&<span className="ml-1 font-normal text-muted-foreground">(opsional)</span>}</label>}



export default function AIModulAjar({onBack}:AIModulAjarProps){

  const [educationLevel,setEducationLevel]=useState<EducationLevel>("")

  const [phase,setPhase]=useState("")

  const [grade,setGrade]=useState("")

  const [subject,setSubject]=useState("")

  const [semester,setSemester]=useState("")

  const [topic,setTopic]=useState("")

  const [meetingCount,setMeetingCount]=useState(2)

  const [duration,setDuration]=useState(40)

  const [curriculumMode,setCurriculumMode]=useState("tp"); const [cp,setCp]=useState(""); const [tp,setTp]=useState(""); const [readiness,setReadiness]=useState("Beragam"); const [studentNotes,setStudentNotes]=useState("")

  const [autoDimensions,setAutoDimensions]=useState(true); const [dimensions,setDimensions]=useState<string[]>([]); const [autoPedagogy,setAutoPedagogy]=useState(true); const [strategy,setStrategy]=useState(""); const [context,setContext]=useState(""); const [technologyMode,setTechnologyMode]=useState("relevant"); const [technology,setTechnology]=useState("")

  const [support,setSupport]=useState(true); const [enrichment,setEnrichment]=useState(true); const [productVariation,setProductVariation]=useState(false); const [alternativeActivity,setAlternativeActivity]=useState(false); const [outputMode,setOutputMode]=useState("complete"); const [attachments,setAttachments]=useState<string[]>([])

  const [openSections,setOpenSections]=useState<Record<string,boolean>>({context:true,curriculum:true,students:false,design:false,support:false,output:true}); const [message,setMessage]=useState(""); const [isGenerating,setIsGenerating]=useState(false); const [result,setResult]=useState<ModulAjarResult|null>(null); const [isEditing,setIsEditing]=useState(false); const [draft,setDraft]=useState<ModulAjarResult|null>(null)

  const phases=useMemo(()=>educationLevel?phasesByLevel[educationLevel]??[]:[],[educationLevel]); const grades=useMemo(()=>educationLevel?gradesByLevel[educationLevel]??[]:[],[educationLevel]); const subjects=useMemo(()=>educationLevel?subjectsByLevel[educationLevel]??[]:[],[educationLevel])

  const isComplete=Boolean(educationLevel&&phase&&grade&&subject&&semester&&topic.trim()&&(curriculumMode==="tp"?tp.trim():curriculumMode==="cp"?cp.trim():true))

  const toggleSection=(key:string)=>setOpenSections(v=>({...v,[key]:!v[key]})); const toggleDimension=(v:string)=>setDimensions(c=>c.includes(v)?c.filter(x=>x!==v):[...c,v]); const toggleAttachment=(v:string)=>setAttachments(c=>c.includes(v)?c.filter(x=>x!==v):[...c,v])
  const updateDraft=(updater:(value:ModulAjarResult)=>ModulAjarResult)=>setDraft(current=>current?updater(current):current)
  const startEditing=()=>{if(!result)return;setDraft(structuredClone(result));setIsEditing(true);window.scrollTo({top:0,behavior:"smooth"})}
  const saveEditing=()=>{if(!draft)return;setResult(structuredClone(draft));setIsEditing(false);setDraft(null);setMessage("Perubahan Modul Ajar berhasil disimpan");window.scrollTo({top:0,behavior:"smooth"})}
  const printModule=()=>{setIsEditing(false);setDraft(null);window.setTimeout(()=>window.print(),50)}

  async function handleGenerate(){

    if(!isComplete){

      setMessage("Lengkapi informasi wajib terlebih dahulu sebelum membuat modul")

      setOpenSections(v=>({...v,context:true,curriculum:true}))

      return

    }

    setIsGenerating(true)

    setMessage("")

    try{

      const {data:{session}}=await supabase.auth.getSession()

      if(!session?.access_token){

        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali")

      }

      const {data,error}=await supabase.functions.invoke("dinoai-modul-ajar",{

        body:{

          educationLevel,

          phase,

          grade,

          subject,

          semester,

          topic:topic.trim(),

          meetingCount,

          duration,

          curriculumMode,

          cp:cp.trim(),

          tp:tp.trim(),

          readiness,

          studentNotes:studentNotes.trim(),

          autoDimensions,

          dimensions,

          autoPedagogy,

          strategy,

          context,

          technologyMode,

          technology:technology.trim(),

          support,

          enrichment,

          productVariation,

          alternativeActivity,

          outputMode,

          attachments,

        },

        headers:{

          Authorization:`Bearer ${session.access_token}`,

        },

      })

      if(error){

        let message=error.message||"AI Modul Ajar gagal diproses"

        try{

          const context=await error.context?.json()

          if(context?.error) message=context.error

        }catch{}

        throw new Error(message)

      }

      if(!data?.success||!data?.modul){

        throw new Error(data?.error||"AI Modul Ajar tidak mengembalikan hasil")

      }

      setResult(data.modul as ModulAjarResult)

      setMessage("Modul Ajar berhasil dibuat. Periksa hasil sebelum digunakan")

      window.scrollTo({top:0,behavior:"smooth"})

    }catch(error){

      console.error("AI Modul Ajar error:",error)

      setMessage(error instanceof Error?error.message:"Terjadi kesalahan saat membuat Modul Ajar")

    }finally{

      setIsGenerating(false)

    }

  }

  return <div className="min-h-screen overflow-x-hidden bg-background text-foreground"><div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"><div className="dino-float absolute left-[-140px] top-[120px] h-[320px] w-[320px] rounded-full bg-[#EECDA3]/25 blur-3xl"/><div className="dino-float-slow absolute right-[-120px] top-[180px] h-[360px] w-[360px] rounded-full bg-[#EF629F]/15 blur-3xl"/></div>

    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8"><button type="button" onClick={onBack} className="dino-button inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-4 py-3 text-sm font-semibold backdrop-blur-xl dark:bg-white/5"><ArrowLeft className="h-4 w-4"/>Kembali</button><div className="flex items-center gap-2 text-sm font-semibold"><img src="/logodino.PNG" alt="" className="h-5 w-5 object-contain"/>AI Modul Ajar</div></div></header>

    <main className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8"><section className="dino-enter mb-8"><div className="dino-glass relative overflow-hidden rounded-[32px] p-7 sm:p-10"><div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#EF629F]/10 blur-3xl"/><div className="relative max-w-4xl"><div className="flex items-center gap-2 text-sm font-semibold text-[#EF629F]"><Sparkles className="h-4 w-4"/>DinoEdu AI</div><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">AI Modul Ajar</h1><p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">Bantu menyusun perencanaan pembelajaran yang praktis, terstruktur, selaras dengan tujuan, dan dapat disesuaikan dengan kebutuhan kelas</p><div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#EF629F]/15 bg-[#EF629F]/5 px-4 py-2 text-xs font-medium text-muted-foreground"><Lightbulb className="h-4 w-4 text-[#EF629F]"/>Isi seperlunya — DinoAI membantu melengkapi bagian yang relevan</div></div></div></section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="space-y-5">

        <Section number="1" title="Konteks Pembelajaran" description="Informasi dasar yang menjadi konteks modul" open={openSections.context} onToggle={()=>toggleSection("context")}><div className="grid gap-5 sm:grid-cols-2">

          <div><FieldLabel>Jenjang</FieldLabel><select value={educationLevel} onChange={e=>{setEducationLevel(e.target.value as EducationLevel);setPhase("");setGrade("");setSubject("")}} className={selectClass}><option value="">Pilih jenjang</option>{Object.keys(phasesByLevel).map(x=><option key={x}>{x}</option>)}</select></div>

          <div><FieldLabel>Fase</FieldLabel><select value={phase} onChange={e=>setPhase(e.target.value)} disabled={!educationLevel} className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-50`}><option value="">Pilih fase</option>{phases.map(x=><option key={x}>{x}</option>)}</select></div>

          <div><FieldLabel>Kelas</FieldLabel><select value={grade} onChange={e=>setGrade(e.target.value)} disabled={!educationLevel} className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-50`}><option value="">Pilih kelas</option>{grades.map(x=><option key={x}>{x}</option>)}</select></div>

          <div><FieldLabel>Mata Pelajaran</FieldLabel><select value={subject} onChange={e=>setSubject(e.target.value)} disabled={!educationLevel} className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-50`}><option value="">Pilih mata pelajaran</option>{subjects.map(x=><option key={x}>{x}</option>)}</select></div>

          <div><FieldLabel>Semester</FieldLabel><select value={semester} onChange={e=>setSemester(e.target.value)} className={selectClass}><option value="">Pilih semester</option><option>Ganjil</option><option>Genap</option></select></div>

          <div className="sm:col-span-2"><FieldLabel>Topik / Materi</FieldLabel><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Contoh: Ekosistem dan interaksi antarmakhluk hidup" className={inputClass}/></div>

          <div><FieldLabel>Jumlah Pertemuan</FieldLabel><input type="number" min={1} max={20} value={meetingCount} onChange={e=>setMeetingCount(Math.max(1,Math.min(20,Number(e.target.value)||1)))} className={inputClass}/></div>

          <div><FieldLabel>Durasi per Pertemuan</FieldLabel><div className="flex items-center gap-3"><input type="number" min={1} max={480} value={duration} onChange={e=>setDuration(Math.max(1,Math.min(480,Number(e.target.value)||1)))} className={inputClass}/><span className="shrink-0 text-sm text-muted-foreground">menit per pertemuan</span></div></div>

        </div></Section>

        <Section number="2" title="Kurikulum & Tujuan" description="Hubungkan modul dengan CP atau tujuan pembelajaran yang Anda miliki" open={openSections.curriculum} onToggle={()=>toggleSection("curriculum")}><div className="grid gap-3 sm:grid-cols-3">{[["tp","Saya sudah memiliki TP"],["cp","Saya memiliki CP, bantu turunkan TP"],["topic","Bantu rancang TP dari topik"]].map(([v,l])=><button key={v} type="button" onClick={()=>setCurriculumMode(v)} className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${curriculumMode===v?"border-[#EF629F]/50 bg-[#EF629F]/10 text-[#EF629F]":"border-border/70 bg-white/30 hover:border-[#EF629F]/30 dark:bg-white/5"}`}><span className={`mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border ${curriculumMode===v?"border-[#EF629F] bg-[#EF629F] text-white":"border-border"}`}>{curriculumMode===v&&<Check className="h-3 w-3"/>}</span>{l}</button>)}</div><div className="mt-5">{curriculumMode==="tp"&&<><FieldLabel>Tujuan Pembelajaran</FieldLabel><textarea rows={5} value={tp} onChange={e=>setTp(e.target.value)} placeholder="Tuliskan satu atau beberapa tujuan pembelajaran yang ingin dicapai" className={`${inputClass} resize-y leading-7`}/></>}{curriculumMode==="cp"&&<><FieldLabel>Capaian Pembelajaran</FieldLabel><textarea rows={7} value={cp} onChange={e=>setCp(e.target.value)} placeholder="Tempelkan CP dari dokumen kurikulum yang Anda gunakan" className={`${inputClass} resize-y leading-7`}/><p className="mt-2 text-xs leading-5 text-muted-foreground">DinoAI akan membantu mengoperasionalkan CP menjadi tujuan pembelajaran. Periksa dan sesuaikan hasil dengan dokumen kurikulum satuan pendidikan</p></>}{curriculumMode==="topic"&&<div className="rounded-2xl border border-[#EF629F]/15 bg-[#EF629F]/5 p-5 text-sm leading-6 text-muted-foreground">DinoAI akan membantu merumuskan tujuan pembelajaran dari jenjang, fase, kelas, mata pelajaran, topik, dan konteks yang Anda berikan</div>}</div></Section>

        <Section number="3" title="Profil Murid" description="Berikan konteks kelas agar aktivitas lebih realistis" open={openSections.students} onToggle={()=>toggleSection("students")}><div className="grid gap-5 sm:grid-cols-2"><div><FieldLabel>Kesiapan Murid</FieldLabel><select value={readiness} onChange={e=>setReadiness(e.target.value)} className={selectClass}><option>Belum diketahui</option><option>Perlu penguatan</option><option>Beragam</option><option>Cukup siap</option><option>Sangat siap</option></select></div><div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">Jika belum mengetahui kondisi kelas secara rinci, pilih <strong className="text-foreground">Beragam</strong>. DinoAI akan merancang dukungan yang fleksibel</div><div className="sm:col-span-2"><FieldLabel optional>Catatan karakteristik kelas</FieldLabel><textarea rows={4} value={studentNotes} onChange={e=>setStudentNotes(e.target.value)} placeholder="Contoh: kemampuan murid beragam, lebih mudah memahami konsep melalui contoh konkret dan diskusi" className={`${inputClass} resize-y leading-7`}/></div></div></Section>

        <Section number="4" title="Desain Pembelajaran" description="Atur pendekatan, konteks, dimensi Profil Lulusan, dan teknologi" open={openSections.design} onToggle={()=>toggleSection("design")}><div className="space-y-7"><div><div className="flex flex-wrap items-center justify-between gap-3"><FieldLabel>Dimensi Profil Lulusan</FieldLabel><button type="button" onClick={()=>setAutoDimensions(v=>!v)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${autoDimensions?"bg-[#EF629F]/10 text-[#EF629F]":"border border-border text-muted-foreground"}`}>{autoDimensions?"DinoAI memilih":"Pilih sendiri"}</button></div>{!autoDimensions?<div className="grid gap-2 sm:grid-cols-2">{graduateDimensions.map(x=><label key={x} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-white/30 p-3 text-sm leading-5 dark:bg-white/5"><input type="checkbox" checked={dimensions.includes(x)} onChange={()=>toggleDimension(x)} className="mt-1 accent-[#EF629F]"/>{x}</label>)}</div>:<p className="text-sm leading-6 text-muted-foreground">DinoAI akan memilih dimensi yang benar-benar relevan dengan tujuan dan aktivitas pembelajaran, bukan otomatis memilih semuanya</p>}</div>

          <div><div className="flex flex-wrap items-center justify-between gap-3"><FieldLabel>Praktik Pedagogis</FieldLabel><button type="button" onClick={()=>setAutoPedagogy(v=>!v)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${autoPedagogy?"bg-[#EF629F]/10 text-[#EF629F]":"border border-border text-muted-foreground"}`}>{autoPedagogy?"DinoAI memilih":"Pilih sendiri"}</button></div>{!autoPedagogy&&<div className="flex flex-wrap gap-2">{pedagogicalStrategies.map(x=><button key={x} type="button" onClick={()=>setStrategy(strategy===x?"":x)} className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${strategy===x?"border-[#EF629F]/50 bg-[#EF629F]/10 text-[#EF629F]":"border-border/70 bg-white/30 dark:bg-white/5"}`}>{x}</button>)}</div>}</div>

          <div><FieldLabel>Konteks Pembelajaran</FieldLabel><select value={context} onChange={e=>setContext(e.target.value)} className={selectClass}><option value="">Bebas / DinoAI memilih</option>{contexts.map(x=><option key={x}>{x}</option>)}</select></div>

          <div><FieldLabel>Pemanfaatan Teknologi</FieldLabel><div className="grid gap-2 sm:grid-cols-3">{[["none","Tidak diperlukan"],["relevant","Jika relevan, DinoAI memilih"],["custom","Saya menentukan"]].map(([v,l])=><button key={v} type="button" onClick={()=>setTechnologyMode(v)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium ${technologyMode===v?"border-[#EF629F]/50 bg-[#EF629F]/10 text-[#EF629F]":"border-border/70 bg-white/30 dark:bg-white/5"}`}>{l}</button>)}</div>{technologyMode==="custom"&&<input value={technology} onChange={e=>setTechnology(e.target.value)} placeholder="Contoh: Google Forms, Canva, video, spreadsheet" className={`${inputClass} mt-3`}/>}</div>

        </div></Section>

        <Section number="5" title="Diferensiasi & Dukungan" description="Tambahkan dukungan yang membantu kebutuhan murid" open={openSections.support} onToggle={()=>toggleSection("support")}><div className="grid gap-3 sm:grid-cols-2">{[["support",support,setSupport,"Dukungan bagi murid yang membutuhkan bantuan"],["enrichment",enrichment,setEnrichment,"Aktivitas pengayaan"],["productVariation",productVariation,setProductVariation,"Variasi produk hasil belajar"],["alternativeActivity",alternativeActivity,setAlternativeActivity,"Alternatif aktivitas"]].map(([key,checked,setter,label])=><label key={String(key)} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-white/30 p-4 text-sm leading-6 dark:bg-white/5"><input type="checkbox" checked={Boolean(checked)} onChange={e=>(setter as (v:boolean)=>void)(e.target.checked)} className="mt-1 accent-[#EF629F]"/>{label as string}</label>)}</div></Section>

        <Section number="6" title="Output & Lampiran" description="Pilih bentuk dokumen yang ingin dihasilkan" open={openSections.output} onToggle={()=>toggleSection("output")}><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={()=>setOutputMode("complete")} className={`rounded-2xl border p-5 text-left ${outputMode==="complete"?"border-[#EF629F]/50 bg-[#EF629F]/10":"border-border/70 bg-white/30 dark:bg-white/5"}`}><div className="flex items-center gap-2 font-bold"><FilePlus2 className="h-5 w-5 text-[#EF629F]"/>Modul Ajar Lengkap</div><p className="mt-2 text-sm leading-6 text-muted-foreground">Identifikasi, desain, pengalaman belajar, asesmen, media, sumber, dan dukungan belajar</p></button><button type="button" onClick={()=>setOutputMode("compact")} className={`rounded-2xl border p-5 text-left ${outputMode==="compact"?"border-[#EF629F]/50 bg-[#EF629F]/10":"border-border/70 bg-white/30 dark:bg-white/5"}`}><div className="flex items-center gap-2 font-bold"><BookOpen className="h-5 w-5 text-[#EF629F]"/>Rencana Pembelajaran Ringkas</div><p className="mt-2 text-sm leading-6 text-muted-foreground">Fokus pada tujuan, langkah pembelajaran, pengalaman belajar, dan asesmen</p></button></div><div className="mt-6"><FieldLabel>Lampiran</FieldLabel><div className="grid gap-2 sm:grid-cols-2">{[["lkpd","LKPD"],["assessment","Instrumen Asesmen"],["rubric","Rubrik"],["reflection","Lembar Refleksi"],["reading","Bahan Bacaan"]].map(([v,l])=><label key={v} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-white/30 p-3 text-sm dark:bg-white/5"><input type="checkbox" checked={attachments.includes(v)} onChange={()=>toggleAttachment(v)} className="accent-[#EF629F]"/>{l}</label>)}</div></div></Section>

        <div className="rounded-[28px] border border-[#EF629F]/20 bg-[#EF629F]/5 p-5"><button type="button" onClick={handleGenerate} disabled={isGenerating} className="dino-gradient dino-button flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-bold text-white shadow-lg shadow-pink-500/10 disabled:cursor-not-allowed disabled:opacity-60"><Sparkles className="h-5 w-5"/>{isGenerating?"DinoAI sedang menyusun modul...":"Buat Modul dengan DinoAI"}{!isGenerating&&<span className="ml-1 font-semibold opacity-90">(3 kredit)</span>}</button>{message&&<p className="mt-3 text-center text-sm leading-6 text-muted-foreground">{message}</p>}<p className="mt-3 text-center text-xs leading-5 text-muted-foreground">Hasil dapat ditinjau dan diedit sebelum digunakan</p></div>

      </div><aside className="hidden lg:block"><div className="dino-glass sticky top-28 rounded-[28px] p-6"><div className="flex items-center gap-2 text-sm font-bold"><BookOpen className="h-5 w-5 text-[#EF629F]"/>Rancangan Modul</div><div className="mt-5 space-y-3 text-sm">{[["01","Identifikasi"],["02","Desain Pembelajaran"],["03","Pengalaman Belajar"],["04","Asesmen"],["05","Media & Sumber"],["06","Diferensiasi"]].map(([n,l])=><div key={n} className="flex items-center gap-3 rounded-xl border border-border/50 bg-white/25 px-3 py-2.5 dark:bg-white/5"><span className="text-xs font-bold text-[#EF629F]">{n}</span><span className="text-muted-foreground">{l}</span></div>)}</div><div className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs leading-5 text-muted-foreground">Struktur ini dirancang agar tujuan, pengalaman belajar, dan asesmen tetap saling terhubung</div></div></aside>{result&&<section className="dino-glass mt-6 overflow-hidden rounded-[32px] print-module">
  <div className="border-b border-border/60 px-6 py-6 sm:px-8 print-header">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#EF629F]">Hasil DinoAI</p>
        {isEditing&&draft?<input value={draft.metadata.judul} onChange={e=>updateDraft(v=>({...v,metadata:{...v.metadata,judul:e.target.value}}))} className={`${inputClass} mt-2 text-2xl font-bold`}/>:<h2 className="mt-1 text-2xl font-bold sm:text-3xl">{result.metadata.judul}</h2>}
        <p className="mt-2 text-sm text-muted-foreground">{result.metadata.jenjang} · {result.metadata.fase} · {result.metadata.kelas} · {result.metadata.mataPelajaran}</p>
        <div className="mt-4 inline-flex rounded-full bg-[#EF629F]/10 px-3 py-1.5 text-xs font-semibold text-[#EF629F]">{result.metadata.jumlahPertemuan} pertemuan · {result.metadata.durasiPerPertemuan} menit per pertemuan</div>
      </div>
      <div className="no-print flex flex-wrap gap-2">
        {!isEditing?<><button type="button" onClick={startEditing} className="dino-button rounded-full border border-border/70 bg-white/40 px-4 py-2.5 text-sm font-semibold backdrop-blur-xl dark:bg-white/5">Edit Modul</button><button type="button" onClick={printModule} className="dino-gradient dino-button rounded-full px-4 py-2.5 text-sm font-semibold text-white">Cetak / Simpan PDF</button></>:<><button type="button" onClick={()=>{setIsEditing(false);setDraft(null)}} className="dino-button rounded-full border border-border/70 bg-white/40 px-4 py-2.5 text-sm font-semibold backdrop-blur-xl dark:bg-white/5">Batal</button><button type="button" onClick={saveEditing} className="dino-gradient dino-button rounded-full px-4 py-2.5 text-sm font-semibold text-white">Simpan Perubahan</button></>}
      </div>
    </div>
  </div>
  <div className="space-y-7 p-6 sm:p-8">
    {isEditing&&draft?<div className="space-y-6 no-print">
      <section><h3 className="text-lg font-bold">Identifikasi & Tujuan</h3><div className="mt-3 grid gap-4">
        <div><FieldLabel>Karakteristik Murid</FieldLabel><textarea rows={4} value={draft.identifikasi.karakteristikMurid} onChange={e=>updateDraft(v=>({...v,identifikasi:{...v.identifikasi,karakteristikMurid:e.target.value}}))} className={`${inputClass} resize-y leading-7`}/></div>
        <div><FieldLabel>Kesiapan Murid</FieldLabel><textarea rows={3} value={draft.identifikasi.kesiapanMurid} onChange={e=>updateDraft(v=>({...v,identifikasi:{...v.identifikasi,kesiapanMurid:e.target.value}}))} className={`${inputClass} resize-y leading-7`}/></div>
        <div><FieldLabel>Kebutuhan Belajar</FieldLabel><textarea rows={3} value={draft.identifikasi.kebutuhanBelajar} onChange={e=>updateDraft(v=>({...v,identifikasi:{...v.identifikasi,kebutuhanBelajar:e.target.value}}))} className={`${inputClass} resize-y leading-7`}/></div>
        <div><FieldLabel>Capaian Pembelajaran</FieldLabel><textarea rows={4} value={draft.tujuanPembelajaran.capaianPembelajaran||""} onChange={e=>updateDraft(v=>({...v,tujuanPembelajaran:{...v.tujuanPembelajaran,capaianPembelajaran:e.target.value}}))} className={`${inputClass} resize-y leading-7`}/></div>
        <div><FieldLabel>Tujuan Pembelajaran</FieldLabel><textarea rows={5} value={draft.tujuanPembelajaran.tujuanPembelajaran.join("\n")} onChange={e=>updateDraft(v=>({...v,tujuanPembelajaran:{...v.tujuanPembelajaran,tujuanPembelajaran:e.target.value.split("\n").map(x=>x.trim()).filter(Boolean)}}))} className={`${inputClass} resize-y leading-7`} placeholder="Satu tujuan per baris"/></div>
        <div><FieldLabel>Indikator Ketercapaian</FieldLabel><textarea rows={5} value={draft.tujuanPembelajaran.indikatorKetercapaian.join("\n")} onChange={e=>updateDraft(v=>({...v,tujuanPembelajaran:{...v.tujuanPembelajaran,indikatorKetercapaian:e.target.value.split("\n").map(x=>x.trim()).filter(Boolean)}}))} className={`${inputClass} resize-y leading-7`} placeholder="Satu indikator per baris"/></div>
      </div></section>
      <section><h3 className="text-lg font-bold">Desain Pembelajaran</h3><div className="mt-3 grid gap-4 sm:grid-cols-2">
        {([["praktikPedagogis","Praktik Pedagogis"],["konteksPembelajaran","Konteks Pembelajaran"],["pemanfaatanTeknologi","Pemanfaatan Teknologi"],["lingkunganBelajar","Lingkungan Belajar"],["kemitraanPembelajaran","Kemitraan Pembelajaran"]] as Array<[keyof ModulAjarResult["desainPembelajaran"],string]>).map(([key,label])=><div key={String(key)}><FieldLabel>{label}</FieldLabel><textarea rows={3} value={draft.desainPembelajaran[key]} onChange={e=>updateDraft(v=>({...v,desainPembelajaran:{...v.desainPembelajaran,[key]:e.target.value}}))} className={`${inputClass} resize-y leading-7`}/></div>)}
      </div></section>
      <section><h3 className="text-lg font-bold">Pengalaman Belajar</h3><div className="mt-3 space-y-5">{draft.pengalamanBelajar.map((item,meetingIndex)=><article key={meetingIndex} className="rounded-2xl border border-border/60 bg-white/30 p-5 dark:bg-white/5"><div className="flex items-center justify-between gap-3"><h4 className="font-bold">Pertemuan {item.pertemuan}</h4><span className="text-xs font-semibold text-[#EF629F]">{item.alokasiWaktu} menit</span></div><div className="mt-4 grid gap-4 lg:grid-cols-3">{([["kegiatanPendahuluan","Pendahuluan"],["kegiatanInti","Inti"],["kegiatanPenutup","Penutup"]] as Array<[keyof ModulAjarResult["pengalamanBelajar"][number],string]>).map(([key,label])=><div key={String(key)}><FieldLabel>{label}</FieldLabel><textarea rows={8} value={(item[key] as string[]).join("\n")} onChange={e=>updateDraft(v=>({...v,pengalamanBelajar:v.pengalamanBelajar.map((m,i)=>i===meetingIndex?{...m,[key]:e.target.value.split("\n").map(x=>x.trim()).filter(Boolean)}:m)}))} className={`${inputClass} resize-y leading-6`} placeholder="Satu kegiatan per baris"/></div>)}</div><div className="mt-4"><FieldLabel>Tujuan Pertemuan</FieldLabel><textarea rows={3} value={item.tujuanPertemuan} onChange={e=>updateDraft(v=>({...v,pengalamanBelajar:v.pengalamanBelajar.map((m,i)=>i===meetingIndex?{...m,tujuanPertemuan:e.target.value}:m)}))} className={`${inputClass} resize-y leading-7`}/></div></article>)}</div></section>
      <section><h3 className="text-lg font-bold">Asesmen</h3><div className="mt-3 grid gap-4 lg:grid-cols-3">{Object.entries(draft.asesmen).map(([key,value])=><div key={key} className="rounded-2xl border border-border/60 bg-white/30 p-4 dark:bg-white/5"><p className="font-semibold capitalize">{key}</p><div className="mt-3 space-y-3"><div><FieldLabel>Teknik</FieldLabel><input value={value.teknik} onChange={e=>updateDraft(v=>({...v,asesmen:{...v.asesmen,[key]:{...v.asesmen[key as keyof typeof v.asesmen],teknik:e.target.value}}}))} className={inputClass}/></div><div><FieldLabel>Instrumen</FieldLabel><textarea rows={3} value={value.instrumen} onChange={e=>updateDraft(v=>({...v,asesmen:{...v.asesmen,[key]:{...v.asesmen[key as keyof typeof v.asesmen],instrumen:e.target.value}}}))} className={`${inputClass} resize-y`}/></div>{"kriteria" in value&&<div><FieldLabel>Kriteria</FieldLabel><textarea rows={3} value={value.kriteria||""} onChange={e=>updateDraft(v=>({...v,asesmen:{...v.asesmen,[key]:{...v.asesmen[key as keyof typeof v.asesmen],kriteria:e.target.value}}}))} className={`${inputClass} resize-y`}/></div>}</div></div>)}</div></section>
    </div>:<div className="space-y-7">
      <section><h3 className="text-lg font-bold">Identifikasi Murid</h3><div className="mt-3 grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-border/60 bg-white/30 p-4 dark:bg-white/5"><p className="text-xs font-semibold text-muted-foreground">Karakteristik</p><p className="mt-2 text-sm leading-6">{result.identifikasi.karakteristikMurid}</p></div><div className="rounded-2xl border border-border/60 bg-white/30 p-4 dark:bg-white/5"><p className="text-xs font-semibold text-muted-foreground">Kesiapan</p><p className="mt-2 text-sm leading-6">{result.identifikasi.kesiapanMurid}</p></div><div className="rounded-2xl border border-border/60 bg-white/30 p-4 dark:bg-white/5"><p className="text-xs font-semibold text-muted-foreground">Kebutuhan Belajar</p><p className="mt-2 text-sm leading-6">{result.identifikasi.kebutuhanBelajar}</p></div></div></section>
      <section><h3 className="text-lg font-bold">Tujuan Pembelajaran</h3><div className="mt-3 rounded-2xl border border-border/60 bg-white/30 p-5 dark:bg-white/5">{result.tujuanPembelajaran.capaianPembelajaran&&<p className="text-sm leading-6 text-muted-foreground">{result.tujuanPembelajaran.capaianPembelajaran}</p>}<ul className="mt-3 space-y-2">{result.tujuanPembelajaran.tujuanPembelajaran.map((item,index)=><li key={index} className="text-sm leading-6 text-muted-foreground">{index+1}. {item}</li>)}</ul>{result.tujuanPembelajaran.indikatorKetercapaian.length>0&&<div className="mt-4"><p className="text-sm font-semibold">Indikator Ketercapaian</p><ul className="mt-2 space-y-1.5">{result.tujuanPembelajaran.indikatorKetercapaian.map((item,index)=><li key={index} className="text-sm leading-6 text-muted-foreground">• {item}</li>)}</ul></div>}</div></section>
      <section><h3 className="text-lg font-bold">Desain Pembelajaran</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{Object.entries(result.desainPembelajaran).map(([key,value])=><div key={key} className="rounded-2xl border border-border/60 bg-white/30 p-4 dark:bg-white/5"><p className="text-xs font-semibold capitalize text-muted-foreground">{key.replace(/([A-Z])/g," $1")}</p><p className="mt-2 text-sm leading-6">{value}</p></div>)}</div></section>
      <section><h3 className="text-lg font-bold">Pengalaman Belajar</h3><div className="mt-3 space-y-4">{result.pengalamanBelajar.map(item=><article key={item.pertemuan} className="rounded-2xl border border-border/60 bg-white/30 p-5 dark:bg-white/5"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-bold">Pertemuan {item.pertemuan}</h4><span className="rounded-full bg-[#EF629F]/10 px-3 py-1 text-xs font-semibold text-[#EF629F]">{item.alokasiWaktu} menit</span></div><p className="mt-3 text-sm font-semibold">{item.tujuanPertemuan}</p><div className="mt-4 grid gap-4 lg:grid-cols-3">{([["Pendahuluan",item.kegiatanPendahuluan],["Inti",item.kegiatanInti],["Penutup",item.kegiatanPenutup]] as Array<[string,string[]]>).map(([label,items])=><div key={label}><p className="text-sm font-semibold">{label}</p><ul className="mt-2 space-y-1.5">{items.map((value,index)=><li key={index} className="text-sm leading-6 text-muted-foreground">• {value}</li>)}</ul></div>)}</div></article>)}</div></section>
      <section><h3 className="text-lg font-bold">Asesmen</h3><div className="mt-3 grid gap-3 lg:grid-cols-3">{Object.entries(result.asesmen).map(([key,value])=><div key={key} className="rounded-2xl border border-border/60 bg-white/30 p-4 dark:bg-white/5"><p className="font-semibold capitalize">{key}</p><p className="mt-2 text-sm leading-6 text-muted-foreground"><span className="font-semibold text-foreground">Teknik:</span> {value.teknik||"—"}</p><p className="mt-1 text-sm leading-6 text-muted-foreground"><span className="font-semibold text-foreground">Instrumen:</span> {value.instrumen||"—"}</p>{"kriteria" in value&&<p className="mt-1 text-sm leading-6 text-muted-foreground"><span className="font-semibold text-foreground">Kriteria:</span> {value.kriteria||"—"}</p>}</div>)}</div></section>
      <section><h3 className="text-lg font-bold">Media, Sumber & Dukungan</h3><div className="mt-3 grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-border/60 bg-white/30 p-4 dark:bg-white/5"><p className="font-semibold">Media</p><ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">{result.mediaDanSumber.media.map((x,i)=><li key={i}>• {x}</li>)}</ul><p className="mt-4 font-semibold">Sumber Belajar</p><ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">{result.mediaDanSumber.sumberBelajar.map((x,i)=><li key={i}>• {x}</li>)}</ul></div><div className="rounded-2xl border border-border/60 bg-white/30 p-4 dark:bg-white/5"><p className="font-semibold">Remedial</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{result.dukunganBelajar.remedial}</p><p className="mt-4 font-semibold">Pengayaan</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{result.dukunganBelajar.pengayaan}</p><p className="mt-4 font-semibold">Dukungan Khusus</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{result.dukunganBelajar.dukunganKhusus}</p></div></div></section>
    </div>}
  </div>
</section>}
</div><style>{`@media print{body{background:#fff!important;color:#111!important;font-size:12pt!important}.no-print,header,.dino-no-print{display:none!important}.print-module{display:block!important;background:#fff!important;border:0!important;box-shadow:none!important;color:#111!important}.print-header{border-bottom:2px solid #222!important}.print-module *{color:#111!important;background:transparent!important;box-shadow:none!important}.print-module h2{font-size:22pt!important}.print-module h3{font-size:15pt!important;margin-top:18pt!important}.print-module h4{font-size:12.5pt!important}.print-module p,.print-module li{font-size:10.5pt!important;line-height:1.55!important}.print-module article,.print-module section{break-inside:avoid}.print-module article{border:1px solid #ccc!important;margin-bottom:12pt!important;padding:12pt!important}.print-module{padding:0!important;margin:0!important}@page{size:A4;margin:14mm 14mm 16mm}}`}</style>
</main>

  </div>

}


