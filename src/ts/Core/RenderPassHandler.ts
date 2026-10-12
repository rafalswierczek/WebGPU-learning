/**
 * Właścicielem GPUCommandEncoder jest Renderer - handler tylko nagrywa do niego swoje przejścia.
 * Wszystko, co asynchroniczne (tekstury, pipeline), musi być zrobione wcześniej, poza klatką.
 */
export interface RenderPassHandler
{
    handle(commandEncoder: GPUCommandEncoder): void;
}
