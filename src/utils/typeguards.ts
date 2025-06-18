import { JavaClassDoc } from '../types';

export function isValidClassType(type: string): type is JavaClassDoc['classType'] {
    return ['class', 'interface', 'enum'].includes(type);
} 