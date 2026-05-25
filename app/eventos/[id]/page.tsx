import { redirect } from "next/navigation"

export const revalidate = 7200
export const fetchCache = "default-cache"

export default async function EventoSharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/eventos?item=${encodeURIComponent(id)}`)
}
