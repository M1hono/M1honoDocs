import { ProjectDocIndex, JavaClassDoc } from '../types';
import { isValidClassType } from './typeguards';

/**
 * 简化文档生成器
 * 直接生成丰富的测试数据，不依赖文件系统
 */
export class SimpleDocumentGenerator {
    
    /**
     * 生成完整的测试项目文档
     */
    async generateDocumentation(): Promise<ProjectDocIndex> {
        console.log('🚀 生成 JavaDoc 测试文档...');

        const docIndex: ProjectDocIndex = {
            classes: new Map(),
            packages: new Map(),
            fileToClasses: new Map()
        };

        // 生成测试类数据
        const testClasses = this.createTestClasses();

        // 添加所有类到索引
        for (const classDoc of testClasses) {
            docIndex.classes.set(classDoc.fullName, classDoc);

            // 更新包映射
            const packageName = classDoc.packageName || '';
            if (!docIndex.packages.has(packageName)) {
                docIndex.packages.set(packageName, []);
            }
            const packageClasses = docIndex.packages.get(packageName)!;
            packageClasses.push(classDoc.fullName);

            // 模拟文件映射
            docIndex.fileToClasses.set(classDoc.filePath, [classDoc.fullName]);
        }

        console.log(`✅ 生成完成: ${testClasses.length} 个类, ${docIndex.packages.size} 个包`);
        return docIndex;
    }

    /**
     * 创建丰富的测试类数据
     */
    private createTestClasses(): JavaClassDoc[] {
        const classes: JavaClassDoc[] = [];

        // Mojang Auth 包
        classes.push(...[
            this.createClass('com.mojang.authlib', 'Agent', 'class', [
                'A representation of a authentication agent.',
                'This class holds information about the authentication agent used for login.'
            ].join('\n'), [
                { name: 'name', type: 'String', comment: 'The name of the agent' },
                { name: 'version', type: 'int', comment: 'The version of the agent' }
            ], [
                { name: 'getName', returnType: 'String', comment: 'Gets the agent name' },
                { name: 'getVersion', returnType: 'int', comment: 'Gets the agent version' },
                { name: 'toString', returnType: 'String', comment: 'Returns string representation' }
            ]),

            this.createClass('com.mojang.authlib', 'AuthenticationService', 'interface', [
                'Service interface for authentication operations.',
                'Provides methods to authenticate users and validate tokens.'
            ].join('\n'), [], [
                { name: 'login', returnType: 'AuthenticationResult', comment: 'Authenticates a user with credentials' },
                { name: 'refresh', returnType: 'boolean', comment: 'Refreshes authentication token' },
                { name: 'validate', returnType: 'boolean', comment: 'Validates current authentication' }
            ]),

            this.createClass('com.mojang.authlib', 'BaseAuthenticationService', 'class', [
                'Base implementation of AuthenticationService.',
                'Provides common functionality for authentication services.'
            ].join('\n'), [
                { name: 'agent', type: 'Agent', comment: 'The authentication agent' },
                { name: 'proxy', type: 'Proxy', comment: 'Network proxy settings' }
            ], [
                { name: 'getAgent', returnType: 'Agent', comment: 'Gets the authentication agent' },
                { name: 'setProxy', returnType: 'void', comment: 'Sets the network proxy' },
                { name: 'createRequest', returnType: 'HttpRequest', comment: 'Creates HTTP request' }
            ], 'AuthenticationService'),
        ]);

        // Blaze3D 包
        classes.push(...[
            this.createClass('com.mojang.blaze3d', 'Blaze3D', 'class', [
                'Main class for Blaze3D rendering engine.',
                'Handles 3D graphics rendering and OpenGL operations.'
            ].join('\n'), [
                { name: 'initialized', type: 'boolean', comment: 'Whether the engine is initialized' },
                { name: 'glVersion', type: 'String', comment: 'OpenGL version string' }
            ], [
                { name: 'init', returnType: 'void', comment: 'Initializes the Blaze3D engine' },
                { name: 'shutdown', returnType: 'void', comment: 'Shuts down the engine' },
                { name: 'render', returnType: 'void', comment: 'Renders the current frame' }
            ]),

            this.createClass('com.mojang.blaze3d.vertex', 'VertexBuffer', 'class', [
                'Represents a vertex buffer for 3D rendering.',
                'Stores vertex data in GPU memory for efficient rendering.'
            ].join('\n'), [
                { name: 'bufferId', type: 'int', comment: 'OpenGL buffer ID' },
                { name: 'vertexCount', type: 'int', comment: 'Number of vertices' }
            ], [
                { name: 'bind', returnType: 'void', comment: 'Binds the vertex buffer' },
                { name: 'upload', returnType: 'void', comment: 'Uploads vertex data to GPU' },
                { name: 'draw', returnType: 'void', comment: 'Draws the vertices' }
            ]),
        ]);

        // Minecraft 核心包
        classes.push(...[
            this.createClass('net.minecraft', 'Minecraft', 'class', [
                'Main Minecraft client class.',
                'Represents the main game instance and handles game loop, rendering, and input.'
            ].join('\n'), [
                { name: 'instance', type: 'Minecraft', comment: 'Singleton instance' },
                { name: 'running', type: 'boolean', comment: 'Whether the game is running' },
                { name: 'gameSettings', type: 'GameSettings', comment: 'Game configuration' }
            ], [
                { name: 'getInstance', returnType: 'Minecraft', comment: 'Gets the singleton instance' },
                { name: 'run', returnType: 'void', comment: 'Main game loop' },
                { name: 'shutdown', returnType: 'void', comment: 'Shuts down the game' },
                { name: 'tick', returnType: 'void', comment: 'Updates game logic' }
            ]),

            this.createClass('net.minecraft.client', 'KeyMapping', 'class', [
                'Represents a key binding in the game.',
                'Maps keyboard inputs to game actions.'
            ].join('\n'), [
                { name: 'name', type: 'String', comment: 'Key binding name' },
                { name: 'keyCode', type: 'int', comment: 'Keyboard key code' },
                { name: 'category', type: 'String', comment: 'Key binding category' }
            ], [
                { name: 'isDown', returnType: 'boolean', comment: 'Checks if key is pressed' },
                { name: 'setKey', returnType: 'void', comment: 'Sets the key code' },
                { name: 'getDisplayName', returnType: 'String', comment: 'Gets display name' }
            ]),

            this.createClass('net.minecraft.world', 'Level', 'class', [
                'Represents a game world/level.',
                'Contains all entities, blocks, and world logic.'
            ].join('\n'), [
                { name: 'random', type: 'Random', comment: 'World random generator' },
                { name: 'isClientSide', type: 'boolean', comment: 'True if client-side world' },
                { name: 'entities', type: 'List<Entity>', comment: 'All entities in world' }
            ], [
                { name: 'getBlock', returnType: 'Block', comment: 'Gets block at position' },
                { name: 'setBlock', returnType: 'boolean', comment: 'Sets block at position' },
                { name: 'addEntity', returnType: 'boolean', comment: 'Adds entity to world' },
                { name: 'tick', returnType: 'void', comment: 'Updates world logic' }
            ]),
        ]);

        // Minecraft Forge 包
        classes.push(...[
            this.createClass('net.minecraftforge.common', 'ForgeConfig', 'class', [
                'Configuration class for Minecraft Forge.',
                'Handles mod configuration and settings.'
            ].join('\n'), [
                { name: 'CLIENT', type: 'ClientConfig', comment: 'Client-side configuration' },
                { name: 'SERVER', type: 'ServerConfig', comment: 'Server-side configuration' },
                { name: 'COMMON', type: 'CommonConfig', comment: 'Common configuration' }
            ], [
                { name: 'load', returnType: 'void', comment: 'Loads configuration from file' },
                { name: 'save', returnType: 'void', comment: 'Saves configuration to file' },
                { name: 'reload', returnType: 'void', comment: 'Reloads configuration' }
            ]),

            this.createClass('net.minecraftforge.fml', 'ModLoader', 'class', [
                'Handles loading and management of mods.',
                'Coordinates the mod loading process and lifecycle.'
            ].join('\n'), [
                { name: 'loadedMods', type: 'List<ModContainer>', comment: 'List of loaded mods' },
                { name: 'loadingState', type: 'LoadingState', comment: 'Current loading state' }
            ], [
                { name: 'loadMods', returnType: 'void', comment: 'Loads all discovered mods' },
                { name: 'getMod', returnType: 'ModContainer', comment: 'Gets mod by ID' },
                { name: 'isModLoaded', returnType: 'boolean', comment: 'Checks if mod is loaded' }
            ]),

            this.createClass('net.minecraftforge.event', 'Event', 'class', [
                'Base class for all Forge events.',
                'Events allow mods to react to game occurrences.'
            ].join('\n'), [
                { name: 'cancelled', type: 'boolean', comment: 'Whether event is cancelled' },
                { name: 'phase', type: 'EventPhase', comment: 'Event execution phase' }
            ], [
                { name: 'isCancelled', returnType: 'boolean', comment: 'Checks if event is cancelled' },
                { name: 'setCancelled', returnType: 'void', comment: 'Sets event cancellation' },
                { name: 'getPhase', returnType: 'EventPhase', comment: 'Gets event phase' }
            ]),
        ]);

        // 添加更多包以达到更好的演示效果
        classes.push(...[
            this.createClass('net.minecraft.server', 'MinecraftServer', 'class', 'Dedicated server instance', [], [
                { name: 'start', returnType: 'void', comment: 'Starts the server' },
                { name: 'stop', returnType: 'void', comment: 'Stops the server' }
            ]),

            this.createClass('net.minecraft.world.entity', 'Entity', 'class', 'Base class for all entities', [
                { name: 'uuid', type: 'UUID', comment: 'Unique entity identifier' }
            ], [
                { name: 'tick', returnType: 'void', comment: 'Updates entity logic' }
            ]),

            this.createClass('net.minecraft.world.item', 'Item', 'class', 'Base class for all items', [], [
                { name: 'use', returnType: 'InteractionResult', comment: 'Called when item is used' }
            ]),

            this.createClass('net.minecraft.world.level.block', 'Block', 'class', 'Base class for all blocks', [], [
                { name: 'onPlace', returnType: 'void', comment: 'Called when block is placed' }
            ]),
        ]);

        return classes;
    }

    /**
     * 创建单个测试类
     */
    private createClass(
        packageName: string, 
        className: string, 
        classType: string = 'class',
        comment: string = '',
        fields: Array<{name: string, type: string, comment: string}> = [],
        methods: Array<{name: string, returnType: string, comment: string}> = [],
        superClass?: string
    ): JavaClassDoc {
        const fullName = `${packageName}.${className}`;
        
        return {
            className,
            fullName,
            packageName,
            filePath: `/${packageName.replace(/\./g, '/')}/${className}.java`,
            classType: isValidClassType(classType) ? classType : 'class',
            modifiers: ['public'],
            superClass: superClass || 'Object',
            interfaces: [],
            imports: [],
            classComment: comment || `${classType} ${className}`,
            methods: [
                // 构造函数
                {
                    name: className,
                    returnType: '',
                    parameters: [],
                    modifiers: ['public'],
                    comment: `Constructor for ${className}.`,
                    javadocTags: [],
                    exceptions: [],
                    lineRange: { start: 5, end: 8 },
                    isConstructor: true
                },
                // 自定义方法
                ...methods.map((method, index) => ({
                    name: method.name,
                    returnType: method.returnType,
                    parameters: [],
                    modifiers: ['public'],
                    comment: method.comment,
                    javadocTags: [
                        { tag: '@return', paramName: '', value: `the ${method.returnType}` }
                    ],
                    exceptions: [],
                    lineRange: { start: 10 + index * 5, end: 15 + index * 5 },
                    isConstructor: false
                }))
            ],
            fields: fields.map((field, index) => ({
                name: field.name,
                type: field.type,
                modifiers: ['private'],
                comment: field.comment,
                initialValue: '',
                lineRange: { start: 3 + index, end: 3 + index }
            })),
            lineRange: { start: 1, end: 50 }
        };
    }
} 