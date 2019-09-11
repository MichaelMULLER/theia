/********************************************************************************
 * Copyright (C) 2018 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable } from 'inversify';
import { IGrammarConfiguration } from 'vscode-textmate';
import { TokenizerOption } from './textmate-tokenizer';
import { Disposable } from '@theia/core/lib/common/disposable';

export interface TextmateGrammarConfiguration extends IGrammarConfiguration {

    /**
     * Optional options to further refine the tokenization of the grammar.
     */
    readonly tokenizerOption?: TokenizerOption;

}

export interface GrammarDefinitionProvider {
    getGrammarDefinition(): Promise<GrammarDefinition>;
    getInjections?(scopeName: string): string[];
}

export interface GrammarDefinition {
    format: 'json' | 'plist';
    content: object | string;
    location?: string;
}

@injectable()
export class TextmateRegistry {

    readonly scopeToProvider = new Map<string, GrammarDefinitionProvider>();
    readonly languageToConfig = new Map<string, TextmateGrammarConfiguration>();
    readonly languageIdToScope = new Map<string, string>();

    registerTextmateGrammarScope(scope: string, description: GrammarDefinitionProvider): Disposable {
        const existingProvider = this.scopeToProvider.get(scope);
        if (existingProvider) {
            Promise.all([existingProvider.getGrammarDefinition(), description.getGrammarDefinition()]).then(([a, b]) => {
                if (a.location !== b.location || !a.location && !b.location) {
                    console.warn(new Error(`a registered grammar provider for '${scope}' scope is overridden`));
                }
            });
        }
        this.scopeToProvider.set(scope, description);
        return Disposable.create(() => {
            this.scopeToProvider.delete(scope);
            if (existingProvider) {
                this.scopeToProvider.set(scope, existingProvider);
            }
        });
    }

    getProvider(scope: string): GrammarDefinitionProvider | undefined {
        return this.scopeToProvider.get(scope);
    }

    mapLanguageIdToTextmateGrammar(languageId: string, scope: string): Disposable {
        const existingScope = this.getScope(languageId);
        if (typeof existingScope === 'string') {
            console.warn(new Error(`'${languageId}' language is remapped from '${existingScope}' to '${scope}' scope`));
        }
        this.languageIdToScope.set(languageId, scope);
        return Disposable.create(() => {
            this.languageIdToScope.delete(languageId);
            if (typeof existingScope === 'string') {
                this.languageIdToScope.set(languageId, existingScope);
            }
        });
    }

    getScope(languageId: string): string | undefined {
        return this.languageIdToScope.get(languageId);
    }

    getLanguageId(scope: string): string | undefined {
        for (const key of this.languageIdToScope.keys()) {
            if (this.languageIdToScope.get(key) === scope) {
                return key;
            }
        }
        return undefined;
    }

    registerGrammarConfiguration(languageId: string, config: TextmateGrammarConfiguration): Disposable {
        const existignConfig = this.languageToConfig.get(languageId);
        if (existignConfig) {
            console.warn(new Error(`a registered grammar configuration for '${languageId}' language is overridden`));
        }
        this.languageToConfig.set(languageId, config);
        return Disposable.create(() => {
            this.languageToConfig.delete(languageId);
            if (existignConfig) {
                this.languageToConfig.set(languageId, existignConfig);
            }
        });
    }

    getGrammarConfiguration(languageId: string): TextmateGrammarConfiguration {
        return this.languageToConfig.get(languageId) || {};
    }
}
