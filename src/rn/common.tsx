import "../../shimWrapper.js";

import React from "react";
import { View, Text, Alert, Platform, BackHandler, StyleSheet, NativeSyntheticEvent, TextInputEndEditingEventData, TextInput } from "react-native";
import { TextInput as PaperTextInput, Button as PaperButton, IconButton, TouchableRipple } from "react-native-paper";
import { ItemType } from "react-native-dropdown-picker";

import { BIG_0 } from "../mc";
import { Account } from "../Account";
import { NetInfo, NetInfoManager, NET_ID, nim } from "../NetInfo";



export const COLOR_WHITE              : string = "#FFFFFF";
export const COLOR_LIGHT_GREY         : string = "#E0E0E0";
export const COLOR_MIDDLE_GREY        : string = "#808080";
export const COLOR_BLACK              : string = "#000000";
export const COLOR_DARK_PURPLE        : string = "#600060";
export const COLOR_DARKISH_PURPLE     : string = "#900090";
export const COLOR_GREEN_WASH         : string = "#E0FFE0";
export const COLOR_PURPLE_RIPPLE      : string = "#FFC0FF";
export const COLOR_DARK_PURPLE_RIPPLE : string = "#D080D0";
export const COLOR_RED                : string = "#FF0000";
export const COLOR_RED_WASH           : string = "#FFE0E0";
export const COLOR_GREEN              : string = "#00FF00";
export const COLOR_DULL_GREEN         : string = "#30C030";
export const COLOR_LIGHT_PURPLE       : string = "#FFF0FF";
export const COLOR_LIGHTISH_PURPLE    : string = "#FFE0FF";



export const commonStyles = StyleSheet.create
    ({
    containingView:
        {
        flex: 1,
        flexDirection: "column",
        backgroundColor: COLOR_WHITE,
        margin: 0,
        padding: 0,
        border: 0,
        },
    centeringView:
        {
        alignItems: "center",
        marginLeft: 24,
        marginRight: 24,
        },
    rowContainerV2:
        {
        flexDirection: "row",
        margin: 0,
        padding: 0,
        border: 0,
        alignContent: "center",
        },
    columnContainerV2:
        {
        flexDirection: "column",
        margin: 0,
        padding: 0,
        border: 0,
        alignContent: "center",
        },
    borderedScroller:
        {
        flex: 1,
        padding: 6,
        borderWidth: 1,
        borderRadius: 4,
        borderColor: COLOR_DARKISH_PURPLE
        },
    icon:
        {
        margin: 0,
        padding: 0,
        border: 0,
        },
    topBar:
        {
        height: 40,
        backgroundColor: COLOR_WHITE,
        flexDirection: "row",
        alignItems: "center"
        },
    titleContainingView:
        {
        alignItems: "center",
        flex: 5,
        },
    titleText:
        {
        fontSize: 20,
        color: COLOR_BLACK,
        fontWeight: "bold",
        },
    horizontalBar:
        {
        height: 3,
        backgroundColor: COLOR_DARK_PURPLE,
        },
    squeezed:
        {
        marginLeft: 24,
        marginRight: 24,
        },
    invalidView:
        {
        flexDirection: "row",
        },
    invalidViewText:
        {
        padding: 24,
        color: COLOR_BLACK,
        backgroundColor: COLOR_RED_WASH,
        fontWeight: "bold",
        },
    flex1:
        {
        flex: 1,
        margin: 0,
        padding: 0,
        border: 0,
        },
    });



export const LOADING_STR = "";
export const NO_INFO_STR = "< Failed to Load >";
    


export function normalizeProps(props : any) : any
    {
    return (props.route && props.route.params && (typeof props.route.params === "object")) ? props.route.params : props;
    }



export function handleHardwareBackPress() : () => void
    {
    return backHandler(false);
    }

export function handleHardwareBackPressNoExit() : () => void
    {
    return backHandler(false);
    }

let alertOut : boolean = false;

function backHandler(showExitOption : boolean) : () => void
    {
    if (Platform.OS === "android")
        {
        const onBackPress = () : boolean =>
            {
            if (showExitOption && !alertOut)
                {
                alertOut = true;
                Alert.alert("Exit MetriMask", "Are you sure you want to exit?",
                    [
                    { text: "Don't Exit", style: "cancel", onPress: () : void => { alertOut = false;                       } },
                    { text: "Exit",                        onPress: () : void => { alertOut = false; BackHandler.exitApp() } }
                    ]);
                }
            return true;
            };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
        return () : void => { backHandler.remove(); }
        }
    else
        return () : void => { ; };
    }



export function netInfoDropDownItems() : ItemType<number>[]
    {
    const niman : NetInfoManager = nim();
    const items : ItemType<number>[] = [ ];
    for (let i = 0; i < NET_ID.length; i++)
        {
        const ni : NetInfo = niman.fromId(i);
        items.push({ label: ni.name, value: ni.id } );
        }
    return items;
    }



export type InvalidMessageProps =
    {
    text: string;
    }

export function InvalidMessage(props : InvalidMessageProps) : JSX.Element
    {
    return (
        <View style={ commonStyles.invalidView }>
            <View style={{ flex: 1 }}/>
            <Text style={ commonStyles.invalidViewText }>{ props.text }</Text>
            <View style={{ flex: 1 }}/>
        </View>
        );
    }



export type TitleBarProps =
    {
    title           : string;
    onBurgerPressed : () => any;
    }

export function TitleBar(props : TitleBarProps) : JSX.Element
    {
    return (
        <View style={ commonStyles.topBar }>
            <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } size={ 24 } icon="menu" onPress={ props.onBurgerPressed }/>
            <View style={ commonStyles.titleContainingView }>
                <Text style={ commonStyles.titleText }>{ props.title }</Text>
            </View>
            <IconButton style={ commonStyles.icon } iconColor={ COLOR_WHITE } size={ 24 } icon="menu"/>
        </View>
        );
    }



export type BurgerlessTitleBarProps =
    {
    title : string;
    }

export function BurgerlessTitleBar(props : BurgerlessTitleBarProps) : JSX.Element
    {
    return (
        <View style={ commonStyles.topBar }>
            <View style={ commonStyles.titleContainingView }>
                <Text style={ commonStyles.titleText }>{ props.title }</Text>
            </View>
        </View>
        );
    }



export type SimpleDoubletProps =
    {
    title    : string;
    text     : string;
    icon?    : string;
    onPress? : () => any;
    }

export function SimpleDoublet(props : SimpleDoubletProps) : JSX.Element
    {
    if (props.icon)
        {
        return (
            <View style={ commonStyles.rowContainerV2 }>
                <View style={ commonStyles.columnContainerV2 }>
                    <View style={ commonStyles.flex1 }/>
                    <Text style={{ color: COLOR_MIDDLE_GREY }}>{ props.title }</Text>
                    <Text style={{ color: COLOR_BLACK }}>{ props.text }</Text>
                </View>
                <View style={{ width: 3 }}/>
                <View style={ commonStyles.columnContainerV2 }>
                    <View style={ commonStyles.flex1 }/>
                    <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } size={ 24 } icon={ props.icon } onPress={ props.onPress }/>
                </View>
                <View style={ commonStyles.flex1 }/>
            </View>
            );
        }
    else
        return (
            <>
                <Text style={{ color: COLOR_MIDDLE_GREY }}>{ props.title }</Text>
                <Text style={{ color: COLOR_BLACK }}>{ props.text }</Text>
            </>
            );
    }



export type AddressQuasiDoubletProps =
    {
    title    : string;
    acnt?    : Account;
    address? : string;
    mnsName? : string;
    icon?    : string;
    onPress? : () => any;
    }

export function AddressQuasiDoublet(props : AddressQuasiDoubletProps) : JSX.Element
    {
    const address : string = props.acnt ? props.acnt.wm.address : (props.address ? props.address : "");
    const mnsName : string = props.acnt ? props.acnt.wm.mnsNmae : (props.mnsName ? props.mnsName : "");

    function renderMnsName() : JSX.Element | null
        {
        if (mnsName.length)
            return (<Text style={{ color: COLOR_BLACK }}>{ mnsName }</Text>);
        else
            return null;
        }

    if (props.icon)
        {
        return (
            <View style={ commonStyles.rowContainerV2 }>
                <View style={ commonStyles.columnContainerV2 }>
                    <View style={ commonStyles.flex1 }/>
                    <Text style={{ color: COLOR_MIDDLE_GREY }}>{ props.title }</Text>
                    { renderMnsName() }
                    <Text style={{ color: COLOR_BLACK }}>{ address }</Text>
                </View>
                <View style={{ width: 3 }}/>
                <View style={ commonStyles.columnContainerV2 }>
                    <View style={ commonStyles.flex1 }/>
                    <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } size={ 24 } icon={ props.icon } onPress={ props.onPress }/>
                </View>
                <View style={ commonStyles.flex1 }/>
            </View>
            );
        }
    else
        {
        return (
            <>
                <Text style={{ color: COLOR_MIDDLE_GREY }}>{ props.title }</Text>
                { renderMnsName() }
                <Text style={{ color: COLOR_BLACK }}>{ address }</Text>
            </>
            );
        }
    }



export type DoubleDoubletProps =
    {
    titleL : string;
    textL  : string;
    titleR : string;
    textR  : string;
    };

export function DoubleDoublet(props : DoubleDoubletProps) : JSX.Element
    {
    return (
        <View style={ commonStyles.rowContainerV2 }>
            <View style={ commonStyles.flex1 }>
                <SimpleDoublet title={ props.titleL } text={ props.textL } />
                <View style={ commonStyles.flex1 } />
            </View>
            <View style={ commonStyles.flex1 }>
                <SimpleDoublet title={ props.titleR } text={ props.textR } />
                <View style={ commonStyles.flex1 } />
            </View>
        </View>
        );
    }



export type SimpleTextInputProps =
    {
    label              : string;
    keyboardType?      : string;
    value              : string;
    placeholder?       : string;
    icon?              : string;
    secureTextEntry?   : boolean;
    multiline?         : boolean;
    textAlignVertical? : "auto" | "top" | "bottom" | "center";
    rnRef?             : React.Ref<TextInput>;
    onChangeText?      : (text : string) => void;
    onEndEditing?      : (nsEvent : NativeSyntheticEvent<TextInputEndEditingEventData>) => void;
    onFocus?           : () => any;
    onPressIcon?       : () => any;
    };

export function SimpleTextInput(props : SimpleTextInputProps) : JSX.Element
    {
    const icon = props.icon;
    const onPressIcon = props.onPressIcon;
    if (props.rnRef) (props as any).ref = props.rnRef;
    delete props["icon"];
    delete props["onPressIcon"];
    delete props["rnRef"];
    if (icon && onPressIcon)
        return  (
            <PaperTextInput
                { ...(props as any) }
                selectionColor={ COLOR_DARK_PURPLE }
                underlineColor={ COLOR_DARKISH_PURPLE }
                activeUnderlineColor={ COLOR_DARK_PURPLE }
                right={ (<PaperTextInput.Icon icon={ icon } onPress={ onPressIcon }/>) }/>
            );
    else
        return  (
            <PaperTextInput
                { ...(props as any) }
                selectionColor={ COLOR_DARK_PURPLE }
                underlineColor={ COLOR_DARKISH_PURPLE }
                activeUnderlineColor={ COLOR_DARK_PURPLE }/>
            );
    }



export type SimpleTextInputPairProps =
    {
    left  : SimpleTextInputProps;
    right : SimpleTextInputProps;
    }

export function SimpleTextInputPair(props : SimpleTextInputPairProps) : JSX.Element
    {
    return (
        <View style={ commonStyles.rowContainerV2 }>
            <View style={ commonStyles.flex1 }>
                <SimpleTextInput { ...props.left } />
            </View>
            <View style={{ width: 24 }} />
            <View style={ commonStyles.flex1 }>
                <SimpleTextInput { ...props.right } />
            </View>
        </View>
        );
    }



export type SimpleButtonProps =
    {
    text?     : string;
    icon?     : string;
    disabled? : boolean;
    onPress   : () => void;
    }

export function SimpleButton(props : SimpleButtonProps) : JSX.Element
    {
    const text = props.text;
    delete (props as any)["text"];
    const testColor : string = props.disabled ? COLOR_MIDDLE_GREY : COLOR_BLACK;
    if (text)
        return (
            <PaperButton { ...(props as any) } style={{ borderColor: COLOR_DARKISH_PURPLE, borderWidth: 1 }} mode="outlined" uppercase={ false } color={ COLOR_DARK_PURPLE }>
                <Text style={{ color: testColor }}>{ text }</Text>
            </PaperButton>
            );
    else if (props.icon)
        return (
            <IconButton { ...(props as any) } style={ commonStyles.icon } size={ 24 }/>
            );
    else
        return (
            <IconButton { ...(props as any) } style={ commonStyles.icon } size={ 24 } icon="help"/>
            );
    }



export type SimpleButtonPairProps =
    {
    left  : SimpleButtonProps;
    right : SimpleButtonProps;
    }

export function SimpleButtonPair(props : SimpleButtonPairProps) : JSX.Element
    {
    return (
        <View style={ commonStyles.rowContainerV2 }>
            <View style={ commonStyles.flex1 }>
                <SimpleButton { ...props.left } />
            </View>
            <View style={{ width: 24 }} />
            <View style={ commonStyles.flex1 }>
                <SimpleButton { ...props.right } />
            </View>
        </View>
        );
    }



export type MenuOptionProps =
    {
    icon      : string;
    label     : string;
    disabled? : boolean;
    onPress   : () => void;
    }

export function MenuOption(props : MenuOptionProps) : JSX.Element
    {
    if (props.disabled)
        return (
            <View style={{ flexDirection: "row", margin: 0, borderWidth: 0, padding: 0 }}>
                <View style={{ width: 12 }}/>
                <IconButton icon={ props.icon } disabled={ true } size={ 24 } style={{ margin: 0, padding: 0, borderWidth: 0 }}/>
                <Text style={{ color: COLOR_MIDDLE_GREY, paddingTop: 8, paddingBottom: 6, paddingLeft: 6, paddingRight: 18 }}>{ props.label }</Text>
            </View>
            );
    else
        return (
            <TouchableRipple onPress={ props.onPress } rippleColor={ COLOR_DARK_PURPLE_RIPPLE }>
                <View style={{ flexDirection: "row", margin: 0, borderWidth: 0, padding: 0 }}>
                    <View style={{ width: 12 }}/>
                    <IconButton icon={ props.icon } size={ 24 } style={{ margin: 0, padding: 0, borderWidth: 0 }}/>
                    <Text style={{ color: COLOR_BLACK, paddingTop: 8, paddingBottom: 6, paddingLeft: 6, paddingRight: 18 }}>{ props.label }</Text>
                </View>
            </TouchableRipple>
            );
    }



const CC_0   = "0".charCodeAt(0);
const CC_1   = "1".charCodeAt(0);
const CC_9   = "9".charCodeAt(0);
const CC_DOT = ".".charCodeAt(0);
    
export function formatSatoshi(n : bigint | number | string, decimals : number) : string
    {
    switch (typeof n)
        {
        case "number": return formatSmallSatoshi(n, decimals);
        case "string": return formatStringSatoshi(n, decimals);
        default:       return formatBigSatoshi(n, decimals);
        }
    }

export function formatSmallSatoshi(n : number, decimals : number) : string
    {
    if (n > 0)
        return formatStringSatoshi(n.toString(), decimals);
    else if (n < 0)
        return `-` + formatStringSatoshi((-n).toString(), decimals);
    else
        return `0.0`;
    }

export function formatBigSatoshi(n : bigint, decimals : number) : string
    {
    if (n > BIG_0)
        return formatStringSatoshi(n.toString(), decimals);
    else if (n < BIG_0)
        return `-` + formatStringSatoshi((-n).toString(), decimals);
    else
        return `0.0`;
    }

export function formatStringSatoshi(satStr : string, decimals : number) : string
    {
    let negative = false;
    if (satStr.substring(0, 1) == `-`)
        {
        negative = true;
        satStr = satStr.substring(1);
        }
    if (satStr.length > decimals)
        {
        const leading = satStr.length - decimals;
        satStr = satStr.substring(0, leading) + `.` + (leading == satStr.length ? "0" : satStr.substring(leading));
        }
    else
        {
        while (satStr.length < decimals) satStr = `0` + satStr;
        satStr = `0.` + satStr;
        }
    let len = satStr.length - 1;
    while (satStr.charCodeAt(len) == CC_0) len--;
    if (satStr.charCodeAt(len) == CC_DOT) len++;
    satStr = negative ? `-` + satStr.substring(0, len + 1) : satStr.substring(0, len + 1);
    if (decimals == 0 && satStr.charAt(satStr.length - 2) == ".") satStr = satStr.substring(0, satStr.length - 2);
    return satStr;
    }

export function noumberOfDecimals(floatStr : string) : number
    {
    let i : number = 0;
    while (i < floatStr.length)
        {
        const cc = floatStr.charCodeAt(i);
        if (!(CC_0 <= cc && cc <= CC_9)) break;
        i++;
        }
    if (i >= floatStr.length) return 0;
    if (floatStr.charCodeAt(i) != CC_DOT) return -1;
    i++;
    let start : number = i;
    while (i < floatStr.length)
        {
        const cc = floatStr.charCodeAt(i);
        if (!(CC_0 <= cc && cc <= CC_9)) break;
        i++;
        }
    return i >= floatStr.length ? i - start : -1;
    }

export function validateAndSatoshizeFloatStr(floatStr : string, decimals : number) : string
    {
    const len = floatStr.length;
    let dotIndex : number = -1;
    for (let i = 0; i < len; i++)
        {
        const cc = floatStr.charCodeAt(i);
        if (cc == CC_DOT)
            {
            if (dotIndex >= 0)
                return "";
            else
                dotIndex = i;
            }
        else if (!(CC_0 <= cc && cc <= CC_9))
            return "";
        }
    const zeros : string = "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
    if (dotIndex < 0)
        return floatStr + zeros.substring(0, decimals);
    else
        {
        const decimalsFound : number = len - (dotIndex + 1);
        if (decimalsFound == 0)
            return floatStr.substring(0, dotIndex) + zeros.substring(0, decimals);
        else if (decimalsFound > decimals)
            return floatStr.substring(0, dotIndex) + floatStr.substring(dotIndex + 1, dotIndex + 1 + decimals);
        else if (decimalsFound < decimals)
            return floatStr.substring(0, dotIndex) + floatStr.substring(dotIndex + 1) + zeros.substring(0, decimals - decimalsFound);
        else
            return floatStr.substring(0, dotIndex) + floatStr.substring(dotIndex + 1);
        }
    }

export function validateIntStr(intStr : string, mustBeNonZero : boolean) : boolean
    {
    const len = intStr.length;
    if (!len) return false;
    let nonZero : boolean = false;
    for (let i = 0; i < len; i++)
        {
        const cc = intStr.charCodeAt(i);
        if (CC_1 <= cc && cc <= CC_9)
            nonZero = true;
        else if (cc != CC_0)
            return false;
        }
    return mustBeNonZero ? nonZero : true;
    }
