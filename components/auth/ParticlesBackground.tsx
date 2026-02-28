'use client'

import { useEffect, useMemo, useState } from "react"
import Particles, { initParticlesEngine } from "@tsparticles/react"
import { type Container, type ISourceOptions } from "@tsparticles/engine"
import { loadSlim } from "@tsparticles/slim"

export function ParticlesBackground() {
  const [init, setInit] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => {
      setInit(true)
    })
  }, [])

  const particlesLoaded = async (container?: Container): Promise<void> => {
    console.log(container)
  }

  const options: ISourceOptions = useMemo(
    () => ({
      background: {
        color: {
          value: "transparent",
        },
      },
      fpsLimit: 60,
      interactivity: {
        events: {
          onHover: {
            enable: true,
            mode: "grab",
          },
          resize: {
            enable: true,
          } as any,
        },
        modes: {
          grab: {
            distance: 200,
            links: {
              opacity: 0.3,
            },
          },
        },
      },
      particles: {
        number: {
          value: 40,
          density: {
            enable: true,
            area: 800,
          },
        },
        color: {
          value: ["#D4C5B9", "#B4A5A5", "#E8DDD0"],
        },
        shape: {
          type: "circle",
        },
        opacity: {
          value: { min: 0.05, max: 0.15 },
          animation: {
            enable: true,
            speed: 0.5,
            sync: false,
          },
        },
        size: {
          value: { min: 1, max: 2.5 },
          animation: {
            enable: true,
            speed: 1,
            sync: false,
          },
        },
        links: {
          enable: true,
          distance: 180,
          color: "#D4C5B9",
          opacity: 0.08,
          width: 1,
        },
        move: {
          enable: true,
          speed: 0.5,
          direction: "none",
          random: true,
          straight: false,
          outModes: {
            default: "out",
          },
        },
      },
      detectRetina: true,
    }),
    [],
  )

  if (!init) {
    return null
  }

  return (
    <Particles
      id="particles-bg"
      particlesLoaded={particlesLoaded}
      options={options}
      className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
    />
  )
}
