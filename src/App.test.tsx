import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the generator controls and empty preview state', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /rubik's cube art generator/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/cube rows/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cube columns/i)).toBeInTheDocument()
    expect(screen.queryByText(/requested cube count/i)).not.toBeInTheDocument()
    expect(screen.getByText(/30 cubes/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /upload an image/i })).toBeInTheDocument()
  })

  it('clamps huge dimensions to the exact instruction budget', () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText(/cube rows/i), { target: { value: '200' } })
    fireEvent.change(screen.getByLabelText(/cube columns/i), { target: { value: '200' } })

    expect(screen.getByLabelText(/cube rows/i)).toHaveValue(200)
    expect(screen.getByLabelText(/cube columns/i)).toHaveValue(10)
    expect(screen.getAllByText(/2000 cubes/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/max 2000 cubes/i)).toBeInTheDocument()
  })
})
