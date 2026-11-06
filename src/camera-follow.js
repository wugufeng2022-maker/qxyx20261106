// Carry the camera rig with the bicycle before smoothing view changes.
// Otherwise exponential follow adds speed / damping metres of unwanted rearward lag.
export function translateRideCamera(cameraPosition,lookPosition,previousRidePosition,ridePosition) {
 cameraPosition.add(ridePosition).sub(previousRidePosition);
 lookPosition.add(ridePosition).sub(previousRidePosition);
 previousRidePosition.copy(ridePosition);
}
