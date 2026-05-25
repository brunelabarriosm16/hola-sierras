import { redirect } from "next/navigation"

export const revalidate = 7200
export const fetchCache = "default-cache"

export default async function InstitucionSharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/instituciones?item=${encodeURIComponent(id)}`)
}
