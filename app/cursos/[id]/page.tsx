import { redirect } from "next/navigation"

export const revalidate = 7200
export const fetchCache = "default-cache"

export default async function CursoSharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/cursos?item=${encodeURIComponent(id)}`)
}
