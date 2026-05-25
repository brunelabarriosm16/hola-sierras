'use client'

import { createContext, useContext, useState, ReactNode } from "react"

type Comercio = {
  nombre: string
  categoria: string
  direccion: string
  telefono: string
}

type ComerciosContextType = {
  comercios: Comercio[]
  agregarComercio: (comercio: Comercio) => void
}

const ComerciosContext = createContext<ComerciosContextType | undefined>(undefined)

export function ComerciosProvider({ children }: { children: ReactNode }) {
  const [comercios, setComercios] = useState<Comercio[]>([
    {
      nombre: "Farmacia Varela",
      categoria: "Farmacia",
      direccion: "Av. Principal 123",
      telefono: "099123456",
    },
    {
      nombre: "Panaderia El Sol",
      categoria: "Panaderia",
      direccion: "Calle 25",
      telefono: "098987654",
    },
  ])

  const agregarComercio = (comercio: Comercio) => {
    setComercios((prev) => [...prev, comercio])
  }

  return (
    <ComerciosContext.Provider value={{ comercios, agregarComercio }}>
      {children}
    </ComerciosContext.Provider>
  )
}

export function useComercios() {
  const context = useContext(ComerciosContext)

  if (!context) {
    throw new Error("useComercios debe usarse dentro de ComerciosProvider")
  }

  return context
}
