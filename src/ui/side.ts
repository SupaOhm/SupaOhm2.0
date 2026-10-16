/** Text side for an anchor: even states keep text left (object right), odd states the reverse. */
export const sideFor = (anchor: number): 'left' | 'right' => (anchor % 2 === 0 ? 'left' : 'right');
