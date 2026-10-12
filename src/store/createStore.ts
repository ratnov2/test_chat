import { useSyncExternalStore } from 'react'

type Listener = () => void

export function createStore<S extends object>(initial: S) {
  let state = initial
  const listeners = new Set<Listener>()

  const getState = () => state

  const setState = (update: Partial<S> | ((s: S) => Partial<S>)) => {
    const patch = typeof update === 'function' ? update(state) : update
    const keys = Object.keys(patch) as (keyof S)[]
    if (keys.every((k) => Object.is(patch[k], state[k]))) return
    state = { ...state, ...patch }
    listeners.forEach((l) => l())
  }

  const subscribe = (l: Listener) => {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }

  const useStore = <T>(selector: (s: S) => T): T => useSyncExternalStore(subscribe, () => selector(state))

  return { getState, setState, subscribe, useStore }
}
