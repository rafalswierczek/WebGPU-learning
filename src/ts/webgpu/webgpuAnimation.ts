export class WebGPUAnimation {
    public static startAnimation() {
        function processAnimation() {
            console.log('animation')
    
            requestAnimationFrame(processAnimation);
        }

        requestAnimationFrame(processAnimation);
    }
}

